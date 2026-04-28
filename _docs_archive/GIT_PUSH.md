# Push repository to GitHub (Windows PowerShell)

This file contains safe, copy-pasteable instructions to initialize the repository locally and push it to GitHub. Run these commands from your machine where `git` is installed and you are the repository owner.

1) Open PowerShell and change to the project folder:

```powershell
cd C:\Users\msarw\Downloads\code
```

2) Configure your git identity (only if not set):

```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

3) Initialize, commit, and push (HTTPS):

```powershell
git init
git add .
git commit -m "Initial commit: Healthcare portal with UI/UX enhancements"
git branch -M main
git remote add origin https://github.com/sarwansai8/Team.git
git push -u origin main
```

If Git asks for credentials when pushing, use one of these options:
- Use GitHub Desktop which handles auth for you.
- Use a Personal Access Token (PAT) instead of your password for HTTPS. Create a token at https://github.com/settings/tokens (scopes: `repo`), then use it when PowerShell prompts for your password.
- Use SSH: set up an SSH key and add the public key to GitHub, then use an `git@github.com:...` remote.

If the remote `origin` already exists, remove and re-add it:

```powershell
git remote remove origin
git remote add origin https://github.com/sarwansai8/Team.git
git push -u origin main
```

If you prefer an automated helper, run the `prepare-to-push.ps1` script included in this repo (requires `git` installed). Examples:

Run cleanup (interactive) then push:

```powershell
.\clean-repo.ps1
.\prepare-to-push.ps1 -RemoteUrl "https://github.com/sarwansai8/Team.git"
```

Run cleaner non-interactively and push in one step (force clean):

```powershell
.\prepare-to-push.ps1 -Force -RemoteUrl "https://github.com/sarwansai8/Team.git"
```

Create a minimal `README.md` if missing and push:

```powershell
.\prepare-to-push.ps1 -CreateReadme -RemoteUrl "https://github.com/sarwansai8/Team.git"
```

To overwrite an existing `README.md` use `-OverwriteReadme`.

After pushing, if you want automatic Vercel deployments, connect this GitHub repo to your Vercel project in the Vercel dashboard.
