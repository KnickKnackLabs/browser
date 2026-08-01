#!/usr/bin/env bats

load helpers

setup() {
  setup_identity
  setup_browser_on_path
}

@test "current repository health surfaces exist" {
  for path in \
    README.tsx \
    README.md \
    .mise/tasks/doctor \
    .github/workflows/test.yml \
    libexec/test
  do
    [ -e "$REPO_DIR/$path" ]
  done
}

@test "README.md is generated from README.tsx" {
  run bash -c 'cd "$REPO_DIR" && readme build --check'
  [ "$status" -eq 0 ]
}

@test "doctor observes README lints and optional hook state" {
  run browser doctor
  [ "$status" -eq 0 ]
  [[ "$output" == *"README"* ]]
  [[ "$output" == *"codebase"* ]]
  [[ "$output" == *"pre-commit"* ]]
}

@test "public tasks provide examples through their real help" {
  while IFS= read -r task_file; do
    task_name="$(basename "$task_file")"

    run browser "$task_name" --help
    [ "$status" -eq 0 ]
    [[ "$output" == *"Examples:"* ]]
  done < <(find "$REPO_DIR/.mise/tasks" -type f -print | sort)
}

@test "CI covers macOS Linux tests health and generated README" {
  workflow="$REPO_DIR/.github/workflows/test.yml"
  grep -q 'ubuntu-latest' "$workflow"
  grep -q 'macos-latest' "$workflow"
  grep -q 'mise run test' "$workflow"
  grep -q 'codebase lint' "$workflow"
  grep -q 'readme build --check' "$workflow"
  grep -Fq 'git diff --check "$(git hash-object -t tree /dev/null)" HEAD' "$workflow"
}
