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
    if let Some(screen) = gtk::prelude::WidgetExt::screen(&layer) {
        if let Some(visual) = screen.rgba_visual() {
            layer.set_visual(Some(&visual));
        }
        let css = gtk::CssProvider::new();
        css.load_from_data(
            b"window.repoticker-layer { background-color: transparent; background-image: none; }",
        )?;
        gtk::StyleContext::add_provider_for_screen(
            &screen,
            &css,
            gtk::STYLE_PROVIDER_PRIORITY_APPLICATION,
        );
    }
    layer.style_context().add_class("repoticker-layer");
    // WebKit's natural minimum can exceed a 122 px tray popup. A non-scrolling
    // viewport constrains the allocation rather than letting GTK grow a blank
    // area above the actual card contents.
    let viewport = gtk::ScrolledWindow::new(None::<&gtk::Adjustment>, None::<&gtk::Adjustment>);
    viewport.set_policy(gtk::PolicyType::Never, gtk::PolicyType::Never);
    viewport.set_propagate_natural_height(false);
    viewport.set_propagate_natural_width(false);
    viewport.set_size_request(390, 122);
    viewport.add(&vbox);
    layer.set_default_size(390, 122);
    layer.add(&viewport);

    layer.init_layer_shell();
    layer.set_namespace("repoticker");
    layer.set_layer(Layer::Top);
    layer.set_anchor(Edge::Bottom, true);
    layer.set_anchor(Edge::Right, true);
    let config = crate::read_config(app.handle())?;
    let bottom = config.card_bottom_margin.unwrap_or(46).clamp(0, 5000);
    let right = config.card_right_margin.unwrap_or(10).clamp(0, 5000);
    MARGINS.with(|margins| *margins.borrow_mut() = (bottom, right));
    layer.set_layer_shell_margin(Edge::Bottom, bottom);
    layer.set_layer_shell_margin(Edge::Right, right);
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
        // Force the viewport allocation as well as the layer itself. GTK
        // otherwise uses WebKit's natural minimum and leaves a large gap.
        if let Some(viewport) = window.child() {
            viewport.set_size_request(390, height);
        }
        CONTENT.with(|cell| {
            if let Some(content) = cell.borrow().as_ref() {
                content.set_size_request(390, height);
            }
        });
        window.set_default_size(390, height);
        window.resize(390, height);
        MARGINS.with(|stored| {
            let (bottom, right) = *stored.borrow();
            window.set_layer_shell_margin(Edge::Bottom, bottom);
            window.set_layer_shell_margin(Edge::Right, right);
        });
    })
}

pub fn show(app: &AppHandle) -> Result<(), String> {
    VISIBLE.store(true, Ordering::Release);
    on_main(app, |window| {
        MARGINS.with(|stored| {
            let (bottom, right) = *stored.borrow();
            window.set_layer_shell_margin(Edge::Bottom, bottom);
            window.set_layer_shell_margin(Edge::Right, right);
        });
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
    if !visible() {
        // Ignore any asynchronous pointer deltas arriving after the card hid.
        return Ok(());
    }
    if dx.abs() > 150 || dy.abs() > 150 {
        return Err("Invalid drag delta".into());
    }
    on_main(app, move |window| {
        if !visible() {
            return;
        }
        MARGINS.with(|state| {
            let mut margins = state.borrow_mut();
            let new_bottom = (margins.0 - dy).clamp(0, 5000);
            let new_right = (margins.1 - dx).clamp(0, 5000);
            // Keep popup on the screen when monitor dimensions are available.
            margins.0 = new_bottom;
            margins.1 = new_right;
            window.set_layer_shell_margin(Edge::Bottom, margins.0);
            window.set_layer_shell_margin(Edge::Right, margins.1);
        });
    })
}

/// Persist the manually dragged anchor without changing repository settings.
pub fn persist(app: &AppHandle) -> Result<(), String> {
    let writer = app.clone();
    on_main(app, move |_| {
        MARGINS.with(|state| {
            let (bottom, right) = *state.borrow();
            match crate::read_config(&writer) {
                Ok(mut config) => {
                    config.card_bottom_margin = Some(bottom);
                    config.card_right_margin = Some(right);
                    if let Err(error) = crate::write_config(&writer, &config) {
                        eprintln!("RepoTicker: cannot save card position: {error}");
                    }
                }
                Err(error) => eprintln!("RepoTicker: cannot read card config: {error}"),
            }
        });
    })
}
