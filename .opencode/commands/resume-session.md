---
description: Load the most recent session file and resume work with full context from where the last session ended.
---

# Resume Session Command

Load the last saved session state and orient fully before doing any work.
This command is the counterpart to `/save-session`.

## Usage

```
/resume-session                    # loads most recent
/resume-session 2024-01-15         # loads by date
/resume-session path/to/file.tmp   # loads specific file
```

## Process

### Step 1: Find the session file

Check `.ai/sessions/` for the most recently modified `*-session.tmp` file.
If not found, tell the user and stop.

### Step 2: Read the entire session file

Read the complete file. Do not summarize yet.

### Step 3: Confirm understanding

Respond with a structured briefing:

```
SESSION LOADED: [path]

PROJECT: [project name]

WHAT WE'RE BUILDING:
[2-3 sentence summary]

CURRENT STATE:
Working: [count] items confirmed
In Progress: [list files]
Not Started: [list planned but untouched]

WHAT NOT TO RETRY:
[list every failed approach with its reason]

OPEN QUESTIONS / BLOCKERS:
[list blockers]

NEXT STEP:
[exact next step if defined]

Ready to continue. What would you like to do?
```

### Step 4: Wait for the user

Do NOT start working automatically. Wait for the user to say what to do next.

## Notes

- Never modify the session file when loading it
- "What Not To Retry" must always be shown
- If session is from more than 7 days ago, note the gap
