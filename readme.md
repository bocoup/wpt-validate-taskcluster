# WPT Taskcluster Validation

## Requirements

- Node.js version 8 or later
- A free user account on GitHub.com
- A free user account on TravisCI.com

## Instructions

1. Authenticate with GitHub.com
   1. Visit https://github.com/settings/tokens
   2. Create an access token that includes the `public_repo` scope
   3. Save the access token to a file named `token-github.txt` in the root of
      this repository
2. Authentication with TravisCI
   1. Follow the instructions at https://developer.travis-ci.com/authentication
      to obtain an access token or the TravisCI HTTP API
   2. Save the access token to a file named `token-travisci.txt` in the root of
      this repository
3. Execute the following commands in a terminal:

       npm install
       node .

## License

Copyright 2018 Bocoup under [the GNU General Public License
v3.0](https://www.gnu.org/licenses/gpl-3.0.html)
