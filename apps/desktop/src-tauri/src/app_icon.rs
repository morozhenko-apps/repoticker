//! The same committed PNG drives native Windows/macOS and Linux tray icons.
//! Replacing icon.png via tools/import_icon.py therefore updates all platforms.
const ICON_PNG: &[u8] = include_bytes!("../icons/icon.png");

pub fn tray_rgba() -> (Vec<u8>, u32, u32) {
    let image = image::load_from_memory(ICON_PNG)
        .expect("RepoTicker icon.png must be a decodable PNG")
        .resize_exact(32, 32, image::imageops::FilterType::Lanczos3)
        .to_rgba8();
    let (width, height) = image.dimensions();
    (image.into_raw(), width, height)
}

#[cfg(target_os = "linux")]
pub fn tray_argb() -> (Vec<u8>, u32, u32) {
    let (rgba, width, height) = tray_rgba();
    let mut argb = Vec::with_capacity(rgba.len());
    for pixel in rgba.chunks_exact(4) {
        // StatusNotifierItem expects ARGB32 data in network byte order.
        argb.extend_from_slice(&[pixel[3], pixel[0], pixel[1], pixel[2]]);
    }
    (argb, width, height)
}
