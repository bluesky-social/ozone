#!/usr/bin/env bash

set -u
set -o pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${DEPENDENCY_AUDIT_OUTPUT_DIR:-dependency-audit-reports}"
AUDIT_YARN_BIN="${DEPENDENCY_AUDIT_YARN_BIN:-yarn}"

mkdir -p "${REPO_ROOT}/${OUTPUT_DIR}"

run_audit_for_project() {
  local label="$1"
  local relative_dir="$2"
  local project_dir="${REPO_ROOT}/${relative_dir}"
  local report_dir="${REPO_ROOT}/${OUTPUT_DIR}"
  local full_report="${report_dir}/${label}-recursive-audit.ndjson"
  local full_status_file="${report_dir}/${label}-recursive-audit.exitcode"
  local threshold_report="${report_dir}/${label}-high-threshold.txt"
  local threshold_status_file="${report_dir}/${label}-high-threshold.exitcode"
  local full_status=0
  local threshold_status=0

  if [[ ! -d "${project_dir}" ]]; then
    echo "Dependency audit target does not exist: ${relative_dir}" | tee "${threshold_report}"
    echo "1" > "${full_status_file}"
    echo "1" > "${threshold_status_file}"
    return 1
  fi

  echo "Running full recursive dependency audit for ${label}..."
  (
    cd "${project_dir}" &&
      "${AUDIT_YARN_BIN}" npm audit --recursive --json > "${full_report}" 2>&1
  )
  full_status=$?
  echo "${full_status}" > "${full_status_file}"

  echo "Running high-severity recursive dependency audit for ${label}..."
  (
    cd "${project_dir}" &&
      "${AUDIT_YARN_BIN}" npm audit --recursive --severity high > "${threshold_report}" 2>&1
  )
  threshold_status=$?
  echo "${threshold_status}" > "${threshold_status_file}"

  if [[ "${threshold_status}" -ne 0 ]]; then
    echo "High-severity dependency audit failed for ${label}."
    cat "${threshold_report}"
  fi

  return "${threshold_status}"
}

final_status=0

run_audit_for_project "root" "." || final_status=1
run_audit_for_project "service" "service" || final_status=1

echo "Dependency audit reports written to ${OUTPUT_DIR}."

exit "${final_status}"
