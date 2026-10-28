//! Persist the Windows popup's bottom/right placement within monitor work area.
//! No new config format: reuse optional card margin fields already in Config.
//! Native sizing/placement uses physical pixels so DPI scaling is applied once.
use tauri::{AppHandle, PhysicalPosition, WebviewWindow};

use crate::{read_config, update_config};

const DEFAULT_EDGE_MARGIN: i64 = 12;

fn placement(
    origin: (i64, i64),
    available: (i64, i64),
    window: (i64, i64),
    right: i64,
    bottom: i64,
) -> (i64, i64) {
    let max_x = origin.0 + (available.0 - window.0).max(0);
    let max_y = origin.1 + (available.1 - window.1).max(0);
    (
        (max_x - right.max(0)).clamp(origin.0, max_x),
        (max_y - bottom.max(0)).clamp(origin.1, max_y),
    )
}

fn monitor_area(window: &WebviewWindow) -> Result<Option<((i64, i64), (i64, i64))>, String> {
    let monitor = match window
        .current_monitor()
        .map_err(|error| error.to_string())?
    {
        Some(current) => Some(current),
        None => window
            .primary_monitor()
            .map_err(|error| error.to_string())?,
    };
    Ok(monitor.map(|monitor| {
        let area = monitor.work_area();
        (
            (i64::from(area.position.x), i64::from(area.position.y)),
            (i64::from(area.size.width), i64::from(area.size.height)),
        )
    }))
}

pub(crate) fn restore(app: &AppHandle, window: &WebviewWindow) -> Result<(), String> {
    let Some((origin, available)) = monitor_area(window)? else {
        return Ok(());
    };
    let size = window.outer_size().map_err(|error| error.to_string())?;
    let config = read_config(app)?;
    let (x, y) = placement(
        origin,
        available,
        (i64::from(size.width), i64::from(size.height)),
        i64::from(
            config
                .card_right_margin
                .unwrap_or(DEFAULT_EDGE_MARGIN as i32),
        ),
        i64::from(
            config
                .card_bottom_margin
                .unwrap_or(DEFAULT_EDGE_MARGIN as i32),
        ),
    );
    let x = i32::try_from(x).map_err(|_| "Invalid popup x coordinate")?;
    let y = i32::try_from(y).map_err(|_| "Invalid popup y coordinate")?;
    window
        .set_position(PhysicalPosition::new(x, y))
        .map_err(|error| error.to_string())?;
    Ok(())
}

pub(crate) fn save(app: &AppHandle, window: &WebviewWindow) -> Result<(), String> {
    let Some((origin, available)) = monitor_area(window)? else {
        return Ok(());
    };
    let position = window.outer_position().map_err(|error| error.to_string())?;
    let size = window.outer_size().map_err(|error| error.to_string())?;
    let right = origin.0 + available.0 - i64::from(position.x) - i64::from(size.width);
    let bottom = origin.1 + available.1 - i64::from(position.y) - i64::from(size.height);
    let right = right.clamp(0, i64::from(i32::MAX)) as i32;
    let bottom = bottom.clamp(0, i64::from(i32::MAX)) as i32;
    update_config(app, |config| {
        let changed =
            config.card_right_margin != Some(right) || config.card_bottom_margin != Some(bottom);
        config.card_right_margin = Some(right);
        config.card_bottom_margin = Some(bottom);
        Ok(((), changed))
    })
}

#[cfg(test)]
mod tests {
    use super::placement;

    #[test]
    fn restores_position_for_bottom_right_work_area() {
        assert_eq!(
            placement((0, 0), (1920, 1040), (390, 122), 12, 12),
            (1518, 906)
        );
    }

    #[test]
    fn keeps_bottom_edge_when_view_grows() {
        assert_eq!(
            placement((0, 0), (1920, 1040), (390, 210), 12, 12),
            (1518, 818)
        );
    }

    #[test]
    fn supports_negative_monitor_coordinates_and_high_dpi_sizes() {
        assert_eq!(
            placement((-2560, -100), (2560, 1440), (585, 315), 18, 18),
            (-603, 1007)
        );
    }

    #[test]
    fn clamps_stale_margins_and_oversized_windows() {
        assert_eq!(placement((0, 0), (800, 600), (390, 122), 900, 900), (0, 0));
        assert_eq!(
            placement((10, 20), (200, 100), (390, 122), 12, 12),
            (10, 20)
        );
        assert_eq!(
            placement((0, 0), (800, 600), (390, 122), -20, -30),
            (410, 478)
        );
    }
}

#[link(name = "user32")]
unsafe extern "system" {
    fn SetWindowPos(
        hwnd: *mut std::ffi::c_void,
        insert_after: *mut std::ffi::c_void,
        x: i32,
        y: i32,
        width: i32,
        height: i32,
        flags: u32,
    ) -> i32;
}

/// Establish actual Windows z-order after showing the detached tooltip.
/// A resize must never show a hidden popup, move it or take keyboard focus.
/// Tauri's high-level always-on-top toggle can retain a stale style state.
pub(crate) fn raise_usage_popup(popup: &WebviewWindow) -> Result<(), String> {
    const SWP_NOSIZE: u32 = 0x0001;
    const SWP_NOMOVE: u32 = 0x0002;
    const SWP_NOACTIVATE: u32 = 0x0010;
    let hwnd = popup.hwnd().map_err(|error| error.to_string())?.0 as *mut std::ffi::c_void;
    let topmost = (-1_isize) as *mut std::ffi::c_void; // HWND_TOPMOST
    let changed = unsafe {
        SetWindowPos(
            hwnd,
            topmost,
            0,
            0,
            0,
            0,
            SWP_NOSIZE | SWP_NOMOVE | SWP_NOACTIVATE,
        )
    };
    if changed == 0 {
        return Err(std::io::Error::last_os_error().to_string());
    }
    if std::env::var_os("REPOTICKER_UI_DEBUG").is_some() {
        eprintln!(
            "RepoTicker usage native ordering applied: visible={:?} position={:?} size={:?}",
            popup.is_visible(),
            popup.outer_position(),
            popup.outer_size()
        );
    }
    Ok(())
}

#[link(name = "gdi32")]
unsafe extern "system" {
    fn CreateRoundRectRgn(
        left: i32,
        top: i32,
        right: i32,
        bottom: i32,
        ellipse_width: i32,
        ellipse_height: i32,
    ) -> *mut std::ffi::c_void;
    fn DeleteObject(handle: *mut std::ffi::c_void) -> i32;
}

#[link(name = "user32")]
unsafe extern "system" {
    fn SetWindowRgn(hwnd: *mut std::ffi::c_void, region: *mut std::ffi::c_void, redraw: i32)
        -> i32;
}

/// Clip only the detached usage window to its rounded 11px CSS contour.
/// WebView2 compositing alone need not clear the rectangular backing surface.
pub(crate) fn clip_usage_popup(popup: &WebviewWindow) -> Result<(), String> {
    const CORNER_RADIUS_LOGICAL: f64 = 11.0;
    let size = popup.outer_size().map_err(|error| error.to_string())?;
    let scale = popup.scale_factor().map_err(|error| error.to_string())?;
    let width = i32::try_from(size.width).map_err(|_| "Invalid usage popup width")?;
    let height = i32::try_from(size.height).map_err(|_| "Invalid usage popup height")?;
    if width <= 0 || height <= 0 {
        return Err("Empty usage popup cannot be clipped".into());
    }
    let diameter =
        ((2.0 * CORNER_RADIUS_LOGICAL * scale).round() as i32).clamp(2, width.min(height));
    let hwnd = popup.hwnd().map_err(|error| error.to_string())?.0 as *mut std::ffi::c_void;
    let region = unsafe { CreateRoundRectRgn(0, 0, width, height, diameter, diameter) };
    if region.is_null() {
        return Err(std::io::Error::last_os_error().to_string());
    }
    let attached = unsafe { SetWindowRgn(hwnd, region, 1) };
    if attached == 0 {
        let error = std::io::Error::last_os_error().to_string();
        // A failed attachment leaves ownership with us.
        unsafe { DeleteObject(region) };
        return Err(error);
    }
    // On success Windows owns and frees HRGN: never DeleteObject(region).
    Ok(())
}
