#!/bin/bash

set -euxo pipefail

if [ $# -ne 1 ]; then
	printf "Invalid argument count!\n"
	printf "Usage: $0 OUTPUT_FOLDER\n"
	exit 1
fi

mkdir -p "${1}"
printf "test-content" > "${1}/_test_file.txt"
