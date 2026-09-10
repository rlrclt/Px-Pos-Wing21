#!/bin/bash
# Antigravity CLI Lifecycle Hook: PostToolUse Memory Sync
# Input: JSON payload via stdin
# Output: JSON object via stdout

input=$(cat)

# Future: Can trigger git notes or background indexers if needed
# Exit cleanly with empty JSON contract
echo "{}"
