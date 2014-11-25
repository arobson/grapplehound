## GrappelHound
GrappelHound is a CLI that will create, list, pull, push, and locally purge gists from your working directory. It supports sub-folders and works with *your* personal (public and private) gists only.

### ... but ... why!!?!?!?!?!?!?!?!??!?
Think of it as a quick way to create and consume scaffolding/skeletons for new projects. It's a toy that I built for me, partly for funsies and partly because I loath copying different sets of files around between project folders with a series of cp commands. (This is where you enjoy laughter at my expense)

## Install

```bash
npm install grappelhound -g
```

## Usage
Ask for help
__help__
```bash
gh --help
```

If you can't remember the commands, just type gh and pick what you want...
__menu__
```bash
gh
```

GrappelHound is hand-holdy. You should be able to get what you need from the interactive prompts. As much as I love typing, I'm not going to hand-write all the menu systems for something that I may only ever use.

## Stuff You Should Know

### API Tokens & Auth
The first time you use GrappelHound, it will prompt you for your username and password. I do not save this anywhere nor do I send it to any endpoint other than GitHub's. Please see my dependencies for how this is handled. It's worth checking the source code for how this all happens just so you can feel relatively safe about how your credentials are handled.

GrappelHound will create an API token in your GitHub account. Once created, it will store this token in `~/.grappelhound.json`. This process supports two-factor authentication. If it's gross to you to have a token stored on your hard-drive DO NOT USE GRAPPELHOUND.

If you should delete/lose the `~/.grappelhound.json` file, not to worry, instead of getting a new token, GrappelHound will just find and use the existing token (assuming you didn't delete it from GitHub) it created previously.

### Local Settings
GrappelHound keeps a local `./.grappelhound.json` file in any directory where you're using it. This is how it knows which gists you've pulled down, what files belonged to those gists and things like that. It's good to know its there so you can add it to your .gitignore and .npmignore files OR even decide that this is yet another reason you hate it and shouldn't use it.

# !!!CAUTION!!!
GrappelHound has no unit tests. It is a tortued, frankenstinian beast cobbled together during a late-night, caffeine-fueled, weekend, hack-session from [Mike de Boer's](https://github.com/mikedeboer) fantastic [GitHub API client](https://github.com/mikedeboer/node-github) for Node, [Inquirer](https://www.npmjs.org/package/inquirer) and [Commander](https://www.npmjs.org/package/commander) (and other nice libraries).

## EXTREME DANGER - Pull & Purge
With certain features, like pull and purge, __you can and probably will destroy/overwrite local files when that's the last thing you had intended__. Be extremely careful with these two commands. You'll want to be certain you're using pull/purge in directories where you've recently committed or have back-ups somewhere.

## Contributing (lol)
If you find this thing and think, "If only it ...", please send a PR. It's a bit of a mess but it's also not that complicated and adding features should be relatively straight-forward.