#!/usr/bin/env bash
# Deploys one commit to the tickets namespace (ADR 0006, ADR 0007). CI sends
# k8s/ to the server and runs this there, so the whole deploy, including the
# wait for the migration Job, needs only one SSH connection. By hand, on the
# server: bash k8s/deploy.sh <image tag> manual-$(date +%s)
set -euo pipefail

image_tag=$1
run_id=$2
dir=$(dirname "$0")
job=migrate-$run_id

k() { kubectl -n tickets "$@"; }
render() { sed -e "s|:IMAGE_TAG|:$image_tag|" -e "s|RUN_ID|$run_id|" "$@"; }

# Waits until the Job is Complete (returns 0) or Failed (prints its logs and
# returns 1). activeDeadlineSeconds in migrate.yaml is 300.
wait_for_job() {
  local job=$1 conditions
  local deadline=$((SECONDS + 360))

  while ((SECONDS < deadline)); do
    # The types of the conditions that are true, e.g. "SuccessCriteriaMet Complete ".
    if ! conditions=$(k get job "$job" -o jsonpath='{range .status.conditions[?(@.status=="True")]}{.type}{" "}{end}'); then
      echo "job/$job could not be read" >&2
      return 1
    fi

    # Whole words: newer Kubernetes sets FailureTarget and SuccessCriteriaMet first.
    case " $conditions " in
      *" Complete "*)
        k logs "job/$job"
        return 0
        ;;
      *" Failed "*)
        # The pod may already be gone if the deadline killed it.
        k logs "job/$job" >&2 || true
        echo "job/$job failed: the backend was not rolled out" >&2
        return 1
        ;;
    esac

    sleep 5
  done

  k logs "job/$job" >&2 || true
  echo "job/$job did not finish within 360s" >&2
  return 1
}

k apply -f "$dir/database/"
k rollout status statefulset/postgres --timeout=180s

render "$dir/jobs/migrate.yaml" | k apply -f -
wait_for_job "$job"

render "$dir"/*.yaml | k apply -f -
k rollout status deployment/backend --timeout=120s
k rollout status deployment/frontend --timeout=120s
