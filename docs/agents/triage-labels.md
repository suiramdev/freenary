# Triage Labels

The skills speak in terms of five canonical triage roles. This tracker has no status labels, so each role maps to a label, a missing label, or the state of the item. The labels themselves are listed in [Contribute](../../apps/fumadocs/content/docs/next/contribute.mdx#labels).

| Label in mattpocock/skills | In our tracker | Meaning |
| --- | --- | --- |
| `needs-triage` | no `priority:` label | A maintainer has not set a priority yet. The `Triage` workflow sets one only from a justified impact or a security risk |
| `needs-info` | the `Triage` comment's "For the author" list | Waiting on the reporter for more information |
| `ready-for-agent` | a `priority:` label and no unchecked item under `Still to define` | Fully specified and ready for work. The tracker does not separate agent work from human work; the assignee decides who picks it up |
| `ready-for-human` | `help wanted` or `good first issue` | Fully specified and open to outside contributors. Never set while `Still to define` has an unchecked item |
| `wontfix` | closed as not planned | Will not be actioned. There is no label for it |

When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the corresponding entry from this table.
