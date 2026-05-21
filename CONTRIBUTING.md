# Contributing Guide

Language: English | [简体中文](CONTRIBUTING.zh-CN.md)

Thank you for your interest in contributing to the GenUI SDK open source project! There are many ways to contribute—you can choose one or more based on your strengths and interests:

- [Report new bugs](https://github.com/opentiny/genui-sdk/issues/new?template=bug-report.yml)
- Provide more details for [existing bugs](https://github.com/opentiny/genui-sdk/labels/bug), such as screenshots, detailed reproduction steps, or links to minimal reproducible demos
- Fix typos or improve documentation
- Fix bugs
- Implement new features
- Improve unit tests
- Participate in code reviews

## Submitting Issues

Use GitHub Issues to report bugs. Please include the following information:

- **Clear problem description**: Describe what issue you encountered
- **Reproduction steps**: Describe in detail how to reproduce the issue
- **Expected vs actual behavior**: Explain what you expected and what actually happened
- **Environment information**: Node version, OS, relevant dependency versions, etc.

## Feature Requests

If you have ideas for new features, please submit them via [Issues](https://github.com/opentiny/genui-sdk/issues). Include:

- What problem the feature would solve
- Your expected API or usage pattern

## Submitting Pull Requests

1. **Fork this repository**: Click the Fork button on the [GenUI SDK](https://github.com/opentiny/genui-sdk) repository
2. **Create a new branch**: `git checkout -b feature/amazing-feature` and start your changes
3. **Follow code style**: Ensure your code adheres to the project's coding standards
4. **Update documentation**: Update README.md or relevant docs if needed
5. **Submit Pull Request**: Submit a PR after completing your changes

### Running the Playground Locally

- After forking to your account, clone your fork to your local machine
- Add the upstream remote to sync with the latest upstream code
- Run `pnpm i` in the genui-sdk root directory to install dependencies
- Run `pnpm dev` to start the playground
- Open your browser to access it

```shell
# Replace username with your GitHub username
git clone git@github.com:username/genui-sdk.git
cd genui-sdk

# Add upstream remote
git remote add upstream git@github.com:opentiny/genui-sdk.git

# Install dependencies
pnpm i

# Start Playground development environment
pnpm dev
```

### Running Other Projects Locally

The setup steps for server, docs, etc. are similar to the playground—only the start command differs. See `package.json` for specific commands.

### PR Submission Steps

1. Ensure your local development environment is set up and running correctly
2. Sync with upstream: `git pull upstream main`
3. Create a new branch from upstream: `git checkout -b username/feature-name upstream/main`
4. Develop locally
5. Follow [Conventional Commits](https://www.conventionalcommits.org/) when committing
6. Push to your fork: `git push origin branch-name`
7. Create a PR on the [Pull Requests](https://github.com/opentiny/genui-sdk/pulls) page
8. Wait for code review and address feedback

## Join the Community

If you're interested in GenUI SDK or the OpenTiny open source project, you're welcome to join via:

- Add WeChat assistant: `opentiny-official` to join the tech discussion group
- Join the mailing list: <opentiny@googlegroups.com>

---

Thank you for contributing!
