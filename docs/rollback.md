# Rollback steps

The old site's files stay on `main` (root `index.html`, `styles.css`, `assets/`, …) and are also
kept in the tag `legacy-pre-react-2026-11-18`. Old Firebase data and the legacy rules are not
touched by the new site. Run these from a checkout of this repository with the GitHub CLI signed
in as the owner.

## A. Bring /legacy/ back (new site stays at the root)

Undo the step 5 change (PR "Stop publishing /legacy/") and redeploy:

```sh
git fetch origin
git checkout -b rollback/legacy-copy origin/release/react-preview
git revert -m 1 <merge commit of the step 5 PR>   # shown in the PR, e.g. `gh pr view <number> --json mergeCommit`
git push -u origin rollback/legacy-copy
gh pr create --base release/react-preview --head rollback/legacy-copy --title "Bring back /legacy/" --body "Rollback"
gh pr merge --merge rollback/legacy-copy           # deploys automatically; /legacy/ is the old site again
```

## B. Put the old site back at the root (undo the React preview entirely)

GitHub Pages switches from the workflow deploy back to publishing `main`'s root, which still holds
the old site:

```sh
gh api -X PUT repos/b24dul/b24dul-live/pages -f build_type=legacy \
  -F "source[branch]=main" -F "source[path]=/"
```

Check: <https://b24dul.github.io/b24dul-live/> shows the old site within a few minutes.

To undo B (go back to the new site):

```sh
gh api -X PUT repos/b24dul/b24dul-live/pages -f build_type=workflow
gh workflow run deploy-pages-preview.yml --ref release/react-preview
```

## C. If main's old-site files were ever changed

Restore them from the tag (only those files), then use B:

```sh
git checkout -b rollback/legacy-files origin/main
git checkout legacy-pre-react-2026-11-18 -- index.html styles.css og.png assets
git commit -m "Restore old site files from legacy-pre-react-2026-11-18"
git push -u origin rollback/legacy-files   # then open and merge a PR into main
```
