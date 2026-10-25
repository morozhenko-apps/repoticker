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
