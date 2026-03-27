---
description: Create, verify, or list workflow checkpoints for progress tracking.
---
# Checkpoint Command

Create or verify a checkpoint in your workflow.

## Usage

`/checkpoint [create|verify|list|clear] [name]`

## Implementation

Run the checkpoint script: `bun scripts/checkpoint.mjs <action> [name]`

## Create Checkpoint

When creating a checkpoint:

1. Run `/verify quick` to ensure current state is clean
2. Run: `bun scripts/checkpoint.mjs create <name>`
   - Stashes uncommitted changes with checkpoint name
   - Records git SHA, timestamp, test results, build status
   - Logs to `.ai/checkpoints.log`

3. Report checkpoint created

## Verify Checkpoint

When verifying against a checkpoint:

1. Run: `bun scripts/checkpoint.mjs verify <name>`
2. Compares current state to checkpoint:
   - Files added/modified/deleted since checkpoint
   - Test pass rate now vs then
   - Build status now vs then

3. Report format:
```
CHECKPOINT COMPARISON: $NAME
============================
Files added:     X
Files modified:  X
Files deleted:   X
Tests:       +Y passed
Build:       PASS -> PASS
```

## List Checkpoints

1. Run: `bun scripts/checkpoint.mjs list`

Shows all checkpoints with:
- Name, Timestamp, Git SHA
- Test pass rate, Build status
- Status (current, behind)

## Clear Checkpoints

1. Run: `bun scripts/checkpoint.mjs clear`

Removes old checkpoints, keeps last 5.

## Arguments

$ARGUMENTS:
- `create <name>` - Create named checkpoint
- `verify <name>` - Verify against named checkpoint
- `list` - Show all checkpoints
- `clear` - Remove old checkpoints (keeps last 5)
