# RepoTicker GitHub App registration

Status: registration and live native login are pending. The Rust core
Device Flow state machine exists; it is not yet a working GitHub login.

## One-time setup by the app publisher

Go to the GitHub organization settings -> Developer settings -> GitHub
Apps -> New GitHub App. A personal account can also own the app.

Settings:
- Name: RepoTicker or an available equivalent.
- Homepage: https://github.com/morozhenko-apps/repoticker
- Expire user authorization tokens: enabled.
- Enable Device Flow: enabled.
- Webhooks: disabled for the direct REST mode.
- Repository permissions: Actions, Read-only; Metadata is implicit.
- Organization permissions: Self-hosted runners, Read-only.
- All unrelated repository/organization permissions: No access.
- Installation eligibility: Any account.
- OAuth callback URL: not required for Device Flow. Do not create a
  pretend callback endpoint or distribute the GitHub App client secret.

After registration, copy ONLY the public Client ID and App slug.
The Client ID is NOT the numeric App ID. Never send the client secret,
private key, user access token, installation token or refresh token.
The public Client ID can be compiled into a desktop release.

Install the GitHub App in the organization and grant access to the
selected repositories. Use the organization's own installation approval
policy. The signed-in user's permissions intersect with App permissions.
GitHub's organization self-hosted runner inventory requires the user
to be organization admin; otherwise runner capacity is unknown while
permitted repo job counts remain usable.

## End-user sign-in

An end user does NOT register a GitHub App or deploy Cloudflare Worker.
They click Connect in RepoTicker Settings, receive a one-time code and
enter it on https://github.com/login/device. Native code exchanges it
for a user token with server-enforced polling intervals. Access and
refresh tokens live only in the OS credential manager.

On Linux use Secret Service/KWallet, macOS Keychain and Windows Credential
Manager through a maintained, native credentials implementation.
Never store token strings in WebView JS, config.json, app logs, command
arguments or telemetry. Explicitly handle expired, revoked, denied and
rate-limited states. Device-flow refresh is supported without a client
secret and must atomically rotate the refresh token.

## Remaining implementation and acceptance

- [ ] Register the publisher app and obtain public Client ID.
- [ ] Native HTTPS GitHub transport, bounded responses, server interval
      timer, cancellation, token refresh and OS credential store.
- [ ] GitHub Settings login / logout and chosen organization or repo scope.
- [ ] Authorized Actions collection with independent runner inventory.
- [ ] Verify real KDE sign-in, permission rejection, refresh, disconnect,
      stale/partial state and connected status on the existing tooltip.
- [ ] Run final CI and physical acceptance before new release.

Reference:
https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app
https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app
https://docs.github.com/en/rest/actions/self-hosted-runners
