# Quiet utility menu icons

Replace only the HOME/shared menu's three illustrated raster emblems with original inline SVG line icons: adjustment sliders, gift, envelope. Use the approved navigation's 40-unit viewBox, 1.7 stroke, square caps and miter joins; align all icons in a 26px box with muted gold. Labels, routes and dialog handlers remain intact. Hover and keyboard focus match the restrained panel.

Validation: client/server typecheck and production build pass. Chrome visual inspection at 1280px, 390px and 320px: three vector icons, no raster emblems in the popup, no horizontal clipping, minimum 44px click targets. Keyboard focus/Escape and all three action handlers pass. Browser page errors: zero. API/account responses are fixtures; no actual invite or inquiry was sent. See local/report.json and menu-1280.png.

Staging: runtime `f8743461`, version `6d11ce96-00e4-4d29-a9cd-4397f20736ea`, 100% traffic. All 18 deployed HTML/JS/CSS hashes match. The same 1280/390/320px visual and action checks pass against the deployed frontend, with zero browser page errors. No production deployment.
