#!/bin/bash
set -e

MODE=""
OUTPUT_PATH=""

for arg in "$@"; do
  case $arg in
    --output_path=*) OUTPUT_PATH="${arg#*=}" ;;
    --output_path) ;; # handle --output_path /path split form (value captured next iteration via shift logic below)
    base) MODE="base" ;;
    new) MODE="new" ;;
  esac
done

# Handle --output_path /path (space-separated) form
PREV=""
for arg in "$@"; do
  if [ "$PREV" = "--output_path" ]; then
    OUTPUT_PATH="$arg"
  fi
  PREV="$arg"
done

MODE=${MODE:-base}

JUNIT_ARGS=""
if [ -n "$OUTPUT_PATH" ]; then
  mkdir -p "$(dirname "$OUTPUT_PATH")"
  export JEST_JUNIT_OUTPUT_FILE="$OUTPUT_PATH"
  # Resolve jest-junit to its absolute path so Jest's nested jest-config can find it
  JEST_JUNIT_PATH=$(node -e "console.log(require.resolve('jest-junit'))" 2>/dev/null || echo "jest-junit")
  JUNIT_ARGS="--reporters=default --reporters=$JEST_JUNIT_PATH"
fi

run_jest() {
  if command -v yarn >/dev/null 2>&1; then
    yarn test "$@"
  else
    npx jest "$@"
  fi
}

if [ "$MODE" = "base" ]; then
  run_jest --testPathIgnorePatterns="resumable-finalize" $JUNIT_ARGS
elif [ "$MODE" = "new" ]; then
  run_jest resumable-finalize $JUNIT_ARGS
fi

if [ -n "$OUTPUT_PATH" ] && [ ! -f "$OUTPUT_PATH" ] && [ -f "junit.xml" ]; then
  mkdir -p "$(dirname "$OUTPUT_PATH")"
  cp "junit.xml" "$OUTPUT_PATH"
fi
