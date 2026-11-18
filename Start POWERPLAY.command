#!/bin/bash
cd "$(dirname "$0")" || exit 1
if command -v python3 >/dev/null 2>&1; then
  exec python3 start.py
elif command -v python >/dev/null 2>&1; then
  exec python start.py
else
  echo "Python 3 is not installed. Install it from python.org, then run this file again."
  read -r -p "Press Enter to close..." _
fi
