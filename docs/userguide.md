
Ozone User Guide
================

## Quickstart

The Ozone web interface allows a team of moderators or curators to collaboratively review reports, create labels, inspect content from the atproto network, and more. The Ozone interface and backend service are open source projects developed by Bluesky Social PBC, and released for independent third parties to use and operate. Individual moderation services are responsible for their actions, policies, and decision making, and Bluesky provides no non-public information or access to external moderation services.

Individual users log in to the web interface using an atproto account, with their handle and password. Note that this will probably change in the near future (Spring 2024) when OAuth support is added. Each instance of the web interface is configured to talk to a specific moderation service backend (e.g., an independent instance of the Ozone backend service), and which accounts have permission to log in is configured in the backend.

Once successfully logged in, users will be presented with a queue of un-reviewed reports. Other queues show *escalated* reports and *resolved* reports. Clicking the "Take Action" link in the upper-right will open an action panel, which displays a single reported subject on the left side, historical events and actions on the right side, and allow taking actions like commenting (private to the Ozone system), or adding or removing labels.

A common way to browse the Ozone system is using the "Ctrl Panel". There is a link on the left bar, or you can press Ctrl-K at any time to pop up this quick panel, and paste in a handle, bsky.app URL, or other identifier. You can then quickly access reports, profile metadata, or other views related to the subject. An account profile view displays metadata like public DID PLC history (e.g., account originally registered), recent posts, and history of reports and other events both created by the account and for the account and it's content.

## Concepts

The Ozone system revolves around a few core concepts:

*Subjects* can be either entire accounts, or individual pieces of content. Note that an account profile (including description, avatar, etc) is a distinct subject from the overall account. Subjects are what can be reported, and what actions take effect upon.

*Events* include reports, actions (such as adding labels), and some team-internal workflow helpers like escalation and acknowledgement. Every event has a subject (which it is about) and a creator (the account who caused the event). A few different interfaces allow querying and viewing the history of all events related to a subject.

*Reports* are a specific type of event. They are usually created by users of an app, and get routed to a specific moderation service based on the user's preferences. A special type of report is an *Appeal*, when an account reports itself in response to a moderation intervention.

*Queues* are views of subjects in a particular state. The most popular are "Unreviewed" (reported, and no resolution), "Escalated" (reviewed and flagged for more input or consideration by the team), and "Resolved" (the subject has been reviewed, and reports have either been "acknowledged" with no action, or a specific action has been taken).

The current set of actions available to an independent labeling service:

- Acknowledge: resolves open reports on a subject with no other action
- Escalate: moves subject to the "Escalation" queue, for additional feedback and consideration from the rest of the team
- Label: adds or removes labels from the subject
- Tag: adds or removes tags on the subject. Tags are metadata visible to the entire team, but not publicly visible, including to the subject of the tag.
- Mute: temporarily removes the subject from the "Unreviewed" queue, even if new reports are filed
- Comment: adds a team-private comment about the subject, used for coordination
- Appeal (and Resolve Appeal): a way to manually indicate that the subject has appealed an action (for example, if they appealed via email while account is taken down)
- Takedown (and Reverse Takedown): marks the account as takendown. The scope and impact of this decision will depend on the users and services subscribing to the moderation service

And additional actions relating to infrastructure-level moderation (most independent moderation services will not have access to these):

- InfraTakedown: a takedown at the infrastructure level, for example at a PDS, Relay, or AppView. requires the infrastructure to respect the authority of the moderation service.
- Divert: forwards potentially harmful content from Ozone in to a configured external review system, and removes the content from public access and infrastructure. Used primarily for illegal child abuse imagery.

## Take Action Panel

One of the most frequently used interfaces is the Take Action Panel. This is a modal screen which shows context and history for a single subject, and allows an action to be taken.

The left-hand side shows a representation of the subject. Most Bluesky record types (posts, profiles, etc) will have a rendered view, though it may be incomplete. Content from other applications may not be rendered cleanly, and just display as raw JSON, though they can still have actions taken on them. There is a "Peek" link which opens the Bluesky app to display the relevant content in-context, which may be helpful. The current subject status, any current labels and tags (only from this moderation service, not from external services), and any pinned comments are displayed. Clicking on the handle or username of the subject will show the Ozone account profile page, which may have additional context and metadata.

A drop-down allows selecting an action, which may result in additional options and toggles to be displayed. All action types allow adding a comment, which ends up as team-private metadata that appears in the event log. You can "Submit", or "Submit & Next", which will automatically load the next subject in the current queue (if any).

The right-hand of the panel shows the event log for the subject. It is possible to toggle and see the event history for the entire subject account (if the subject isn't already the entire account), and to filter down the events.

## Account View

Another frequently used view is the account overview. This allows access to public account content (such as profile avatar, description, and recent posts), local metadata like subject status and events, and allows a number of actions to be taken.

Some features, like invite trees/codes and access to the private account email address, require the moderation service to have privileged access to the account's PDS instance; this will not be the case for most independent moderation services. They may also require specific permissions configured for the Ozone user.

The Email tab allows sending mail to the account based on a template or free-form text (see “Email Templates” section for details). 

## Queues and Filtering

Queues are dynamically generated lists of subjects, based on their report status and other metadata.

The default broad categories are "Unresolved", "Escalated", "Resolved", and "All", based on review status. Additional toggles allow displaying subjects even if they are muted; showing only takendown or appealed subjects; or filtering subjects by a handful of major languages.

There are also event log views per-account, or for the entire Ozone system, which allow filtering by event type, datetime range, etc. These do not currently function as queues, however.

## Email and Templates

The Account View has a tab for composing email to an account, based on a template or free-form text. Sending mail is done by request to the account's PDS, which knows the account's actual email address. The PDS may or may not actually deliver the mail on behalf of the moderation service, unless there is a pre-arranged relationship or user opt-in.

Email templates are specific to Ozone backend instances. The available templates are shown in the account profile "Email" tab, and authorized accounts can manage the available templates using a link in the "Send Email" page. Emails are not currently sent as a result of any actions, and must be sent manually.

Email templates can include a small number of variables in double-brackets, like `{{handle}}`, which will expand the the relevant account's handle when the message is actually sent. It is also possible to include triple-quote template comments like `### DESCRIPTION OF IMAGE ###`. These will not be auto-substituted, but the mail will not be sent until this placeholder has been replaced (or an override is toggled).

Separate email templates need to be created for different policy issues, languages, and type of intervention. The name of the template (separate from the subject of the email, which is often very generic) is saved in the event log, along with an optional additional comment. The full email text is not saved to the event log, and the recipient of the email can only see the subject and body, not the template name or any comment.

## Moderator Privacy and Safety

All actions and events taken in Ozone are recorded in the event log with the account of the user who took the action. This is helpful for collaboration and as a papertrail for internal accountability, but could also create a personal safety risk for individual moderators. For example, the Ozone backend database could get hacked, or a team member's account hacked, and the context of which individual took which action be leaked via screenshot or database dump.

Service operators and individuals participating in higher-stakes moderation work should be aware of the personal risks their specific work could entail. In some situations it may be best to use pseudonymous accounts for logging in to Ozone, or to use a single shared account. At a minimum, it is recommended to not use a prominent or recognizable account handle to log in to Ozone.

Another consideration is being logged in to an application like Bluesky at the same time as using Ozone. While there is no direct link, it is common to bounce between the app and Ozone while investigating a subject. It is easy to accidentally "like" or "follow" content in the app with a stray click, which could in some cases leak information that an individual account is participating in moderation work. Additionally, in-app context may render differently based on any block or mute relationships. It is best to use the logged-out view or a neutral/unaffiliated alt account, and potentially even using a dedicated device to prevent accidents.

## Additional Tips and Tricks

The control panel (Ctrl-K) is very helpful for quickly pasting links or identifiers to jump to the relevant page in Ozone. Learn to use it! "Peek" links allow going in the other direction (Ozone to app) for viewing content in-context.

Images which have been labeled as (or reported as) graphic or sexual will display with a blur in the Ozone interface. Mousing over will remove the blur, and clicking will show the original image full-sized in a new tab. If disturbing "not safe for life" images are viewed, even temporarily, some research has suggested that viewing unrelated patterns in a game can prevent imprinting memories. Ozone has a hidden feature: if you open the Ctrl-K menu, type "tetris", and press enter, there is a simple Tetris game embedded in the UI. While Ozone provides a couple small affordances for the reality of encountering disturbing images, it is not designed to be a replacement or substitute for domain-specific tools and workflows for intensive review of disturbing or illegal content.

A common source of confusion is the distinction between account-level events, and content-level events. This is particularly true for "profile records", which are a form of content that is account-wide, but distinct from the account itself. In a few interfaces, there are toggle buttons to rapidly switch between "action account" and "action account's profile"; or "all events for account" and "all events for account and account's content".
