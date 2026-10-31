# R2 public readback: reject HTTP redirects

Date: 2026-10-29. Baseline `d522d69ddc75908ed4adc58f13e080c5828205f4`. Mode B, critical release
contract. This records a narrow decision and does **not** approve live
publication, a new version, changes to signing keys, R2 bucket writes,
`main`, tags or protected environments.

## Problem and evidence

`scripts/r2_release.py::public_readback` used the standard
`urllib.request.urlopen` opener. By default it may follow HTTP
301/302/303/307/308. The verifier checks the final response's status,
size and SHA256 but does not check that bytes were returned directly
from the precise `BASE + relative` public R2 custom-domain URL.
Even when bytes are correct, an external mirror response alone cannot
establish availability of that approved distribution endpoint.
The result could otherwise authorize a publication receipt and
downstream GitHub artifact cleanup.

Five contributing boundaries: approved URL is initially constructed
correctly; default redirect handling may change the destination;
SHA256 checks artifact identity but not origin; receipt contains the
initial URL rather than any final transport URL; tests inject a custom
opener, so default redirect behavior was not exercised. The root
cause is using a redirect-following production HTTP opener in an
exact-origin verification contract.

## Decision / root-cause fix

Use an isolated standard urllib opener with an explicit
`HTTPRedirectHandler` override rejecting redirect requests.
Retain GET, identified user agent, 45-second timeout, status 200,
bounded streaming, source file SHA256/size comparison and injected
opener seam for deterministic offline tests. A 3xx must fail
publication without a success receipt, even if its destination
could return matching content. Do not contact an alternative mirror,
retry behind the scenes, or relax the origin requirement.

## Regression, boundaries and rollout

Two offline tests exercise the **default** production opener path,
not just manually supplied fake openers: simulate 302 to an external
same-byte mirror and prove an error; confirm the no-redirect handler
is installed and a direct exact-URL 200 remains verifiable.
The existing status, corruption and identified GET tests remain.
Mode B scenario N3 external HTTP and N7 origin trust; the 301,
302, 303, 307 and 308 logic shares the same redirect-request guard.
No live R2 request is made by the unit tests. Real CDN acceptance,
failure recovery, GPG and other release gates remain mandatory.

Rollback the isolated script/test commit if the protected public
distribution actually requires an authorized redirect; investigate
and make that requirement an explicit origin policy first. Never
silently accept a different origin or fake a successful receipt.
