# FDM 2026 — SMS / Voice / Chat Recipient Reference

_Compiled directly from the app's source code (`fdm-hub-preview.jsx` + Netlify functions), July 2026._

---

## 1. Call Queue Alerts (fires when a call is **acknowledged** in the Hub)

| Call Type | SMS goes to | Voice goes to | Festival Chat |
|---|---|---|---|
| **Medical** / **Walk-In** | Admin (A1/A2/A3) + Med 1 + Med 2 | Same as SMS | `medical` + `admin` |
| **Fire / Life Safety** | Admin + Med 1 + Med 2 | Same as SMS | `admin` (fire) |
| **Security** | Admin + on-duty MPD officers | Same as SMS | `admin` |
| **Supplies** | Admin only | ❌ None (by design) | `admin` + `restock` |
| **Maintenance** | Admin only | ❌ None (by design) | `admin` |
| **Lost Child** (ack) | ALL approved staff | ALL approved staff | `admin` |

Every row above also always includes the hardcoded Admin 2 number (+1 608-228-9692).

**Requester notification:** whoever submitted the original call also gets a one-off confirmation SMS ("your request has been acknowledged by ___") if their phone was captured on the call.

---

## 2. Lost Child — Initial Report (separate from the ack above)

| Sub-flow | SMS | Voice | Chat | Other |
|---|---|---|---|---|
| **Missing Child** report | ALL staff | ALL staff | `admin`+`medical`+`AllStaff` | Also pings on-duty MPD via `request-mpd` |
| **Found Child** report | ALL approved staff (server-side, via `send-broadcast`) | ALL staff (Admin+Med roster) | `admin`+`medical`+`AllStaff` | — |

---

## 3. Broadcast Alert Screen (Weather / Event / Custom)

You choose **either** a Group **or** a specific Location (not both at once) — whichever tab is active when you hit Send.

### Groups tab
| Group | Who's included | Chat channel(s) |
|---|---|---|
| **All Staff** | Every staff role | `AllStaff` |
| **Admin** | Admin only | `Admin` |
| **Medical** | Med 1 + Med 2 | `AdminMed` |
| **Bars** | All bar station roles | `Bars` + `AllStaff` |
| **Stages** | All stage crew roles | `AllStaff` |
| **Hospitality** | Hospitality roles | `Hospitality` |
| **Misc** | Misc/youth organizer/market roles | `AllStaff` |
| **Everything Else Cafe** | EEC roles | `EverythingBar` |
| **Prize Wheel** | Prize wheel roles | `AllStaff` |

### Locations tab (pick one or more specific spots)
Admin, Med 1, Med 2, Moon Stage, Sun Stage, Lagniappe Stage, Lafayette Stage, Family Fete Stage, Cabaret Stage, Moon Bar, Sun Left Bar, Sun Right Bar, Cabaret Bar, Lafayette Bar, Lagniappe Bar, Family Fete Bar, Everything Else Cafe, Prize Wheel, Hospitality — each maps to just the staff working that specific spot, plus its own chat channel.

**Every Broadcast**, regardless of group/location chosen: SMS + Voice always fire together to the same recipient list, plus Admin 2's number is always included.

---

## 4. 911 Activation

There are 4 separate "Activate 911" buttons in the app (priority call screen, call-queue detail, med active-call screen, and the quick-notify button). All of them now send to the same roster:

- **SMS + Voice** → Admin (hardcoded: Devin +1 608-228-9692, Gary +1 608-235-2925) + the *other* on-duty Med unit (if a Med activates, the other Med gets notified too)
- **Festival Chat** → `admin` + `medical`

---

## 5. MPD Dispatch (`send-mpd.js` — Security calls, Lost Child, general MPD requests)

- **SMS + Voice** → every officer currently marked **ON duty** in the Manage MPD Officers screen
- Admin 2 also gets a summary SMS ("MPD notified: X officers called")
- ❌ No Festival Chat message for this one — it's phone-only to officers

*(Separate from this: `request-mpd.js`, used by the Lost Child flow's "Get PA Script" button, also independently SMS+Voices on-duty MPD officers.)*

---

## 6. Bulk Onboarding ("Send to All Staff")

- **SMS only** → every staff member with a valid phone on file
- ❌ No voice, no chat — this is the welcome/info text, not an alert

---

## Notes on reliability
- All of the above now format phone numbers to `+1XXXXXXXXXX` before sending and dedupe on the *formatted* number, so the same person won't get double-texted even if their number is stored inconsistently in Airtable.
- Supplies and Maintenance are intentionally SMS-only (lower priority than safety alerts) — not a bug.
- MPD dispatch failures are now caught server-side but not yet surfaced in the Hub UI — you'd only see it in Netlify function logs today.
