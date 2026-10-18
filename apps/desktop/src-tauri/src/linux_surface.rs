//! Native GTK3 layer shell for a true KDE Wayland anchored tray card.
//! Reparents the Tauri webview into a top-layer GtkApplicationWindow before
//! it is ever presented. The normal Tauri window stays hidden.
use gtk::prelude::*;
use gtk_layer_shell::{Edge, KeyboardMode, Layer, LayerShell};
use std::{
    cell::RefCell,
    sync::atomic::{AtomicBool, Ordering},
};
use tauri::{App, AppHandle, Manager};

thread_local! {
    static CARD: RefCell<Option<gtk::ApplicationWindow>> = const { RefCell::new(None) };
    static CONTENT: RefCell<Option<gtk::Box>> = const { RefCell::new(None) };
    static MARGINS: RefCell<(i32, i32)> = const { RefCell::new((46, 10)) };
}

static ENABLED: AtomicBool = AtomicBool::new(false);
static VISIBLE: AtomicBool = AtomicBool::new(false);

pub fn enabled() -> bool {
    ENABLED.load(Ordering::Acquire)
}

pub fn visible() -> bool {
    VISIBLE.load(Ordering::Acquire)
}

/// GTK is accessed only on the Tauri main thread.
pub fn install(app: &mut App) -> Result<(), Box<dyn std::error::Error>> {
    // XWayland or an unsupported Wayland compositor should retain the regular
    // frameless topmost Tauri popup instead of attempting unsafe remapping.
    if std::env::var_os("WAYLAND_DISPLAY").is_none() || !gtk_layer_shell::is_supported() {
        return Ok(());
    }
    let win = app
        .get_webview_window("main")
        .ok_or("Tauri card window is missing")?;
    let old = win.gtk_window()?;
    let application = old.application().ok_or("GTK app is missing")?;
    let vbox = win.default_vbox()?;
    let _ = win.hide();
    old.remove(&vbox);

    let layer = gtk::ApplicationWindow::new(&application);
    layer.set_decorated(false);
    layer.set_resizable(false);
    layer.set_app_paintable(true);
    layer.set_default_size(390, 122);
    vbox.set_size_request(390, 122);
    layer.add(&vbox);

    layer.init_layer_shell();
    layer.set_namespace("repoticker");
    layer.set_layer(Layer::Top);
    layer.set_anchor(Edge::Bottom, true);
    layer.set_anchor(Edge::Right, true);
    layer.set_layer_shell_margin(Edge::Bottom, 46);
    layer.set_layer_shell_margin(Edge::Right, 10);
    // Do not reserve any work area; this is a transient popover, not a panel.
    layer.set_exclusive_zone(-1);
    layer.set_keyboard_mode(KeyboardMode::OnDemand);
    // Never present at initialization: the tray controls popup visibility.
    CARD.with(|cell| *cell.borrow_mut() = Some(layer));
    CONTENT.with(|cell| *cell.borrow_mut() = Some(vbox));
    ENABLED.store(true, Ordering::Release);
    Ok(())
}

fn on_main(
    app: &AppHandle,
    action: impl FnOnce(&gtk::ApplicationWindow) + Send + 'static,
) -> Result<(), String> {
    let app = app.clone();
    app.run_on_main_thread(move || {
        CARD.with(|cell| {
            if let Some(window) = cell.borrow().as_ref() {
                action(window);
            }
        });
    })
    .map_err(|err| err.to_string())
}

pub fn resize(app: AppHandle, height: i32) -> Result<(), String> {
    if !(120..=900).contains(&height) {
        return Err("Invalid card height".into());
    }
    // Bottom anchor belongs to the compositor; expanding to a larger height
    // always grows upward, independent of the previous client position.
    on_main(&app, move |window| {
        let max_height = MARGINS.with(|offset| {
            let bottom = offset.borrow().0;
            window.screen().map_or(900, |screen| (screen.height() - bottom - 8).max(122))
        });
        let bounded_height = height.min(max_height);
        CONTENT.with(|cell| {
            if let Some(content) = cell.borrow().as_ref() {
                content.set_size_request(390, bounded_height);
            }
        });
        window.set_default_size(390, bounded_height);
        window.resize(390, bounded_height);
    })
}

pub fn show(app: &AppHandle) -> Result<(), String> {
    VISIBLE.store(true, Ordering::Release);
    on_main(app, |window| {
        window.show_all();
        window.present();
    })
}

pub fn hide(app: &AppHandle) -> Result<(), String> {
    VISIBLE.store(false, Ordering::Release);
    on_main(app, |window| window.hide())
}

/// Move the Wayland popup by adjusting compositor-managed bottom/right margins.
/// The bottom edge remains anchored through subsequent drawer size changes.
pub fn shift(app: &AppHandle, dx: i32, dy: i32) -> Result<(), String> {
    if dx.abs() > 150 || dy.abs() > 150 {
        return Err("Invalid drag delta".into());
    }
    on_main(app, move |window| {
        MARGINS.with(|state| {
            let mut margins = state.borrow_mut();
            let new_bottom = (margins.0 - dy).clamp(0, 5000);
            let new_right = (margins.1 - dx).clamp(0, 5000);
            // Keep popup on the screen when monitor dimensions are available.
            let screen = window.screen();
            let max_bottom = screen.as_ref().map_or(5000, |s| (s.height() - 130).max(0));
            let max_right = screen.as_ref().map_or(5000, |s| (s.width() - 390).max(0));
            margins.0 = new_bottom.min(max_bottom);
            margins.1 = new_right.min(max_right);
            window.set_layer_shell_margin(Edge::Bottom, margins.0);
            window.set_layer_shell_margin(Edge::Right, margins.1);
        });
    })
}
