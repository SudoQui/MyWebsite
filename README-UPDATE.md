# Portfolio refresh package

This package contains the prepared portfolio refresh for `SudoQui/MyWebsite`.

## Main changes

- Keeps Questacon in the experience timeline.
- Keeps DXC intentionally brief as: “Still here, still winning. Check back later.”
- Adds MACT as founder and lead engineer experience.
- Adds a dedicated SudoLabs section using “Community focused engineering studio.”
- Adds project coverage for MACT, MotorHUD, Sawaali, Prayer Wallboard, SudoSpeed, Uni Pen Pals, Invoice OCR, PMO Automation, Rehabilitation Robotics and Nova Rover.
- Includes a replaceable SVG image placeholder for every featured project.
- Updates skills, education, leadership, About, contact links, SEO metadata, sitemap, robots file and 404 page.
- Includes a reusable project case study page and structured project data.

## Apply to the repository

Copy the package contents into the repository root, preserving the directory structure.

```bash
git checkout -b portfolio-refresh-2026
cp -R /path/to/website_update/. .
git add .
git commit -m "Refresh portfolio with MACT and SudoLabs"
git push -u origin portfolio-refresh-2026
```

Then open a pull request into `main`.

## Project images

Replace files under `resources/img/projects/` and keep the same filenames.
