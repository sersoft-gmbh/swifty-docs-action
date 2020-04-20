#!/bin/bash

if [ $# -ne 2 ]; then
	printf "Invalid argument count!\n"
	printf "Usage: $0 OUTPUT_FOLDER CLEAN\n"
	exit 1
fi

TEST_FILE="${1}/_test_file.txt"
if [ "${2}" != 'true' ]; then
  if [ -f "${TEST_FILE}" ]; then
    if [ $(cat "${TEST_FILE}") != "test-content" ]; then
      printf "${TEST_FILE} was overridden!\n"
      exit 1
    fi
  else
    printf "${TEST_FILE} was removed!\n"
    exit 1
  fi
elif [ -f "${TEST_FILE}" ]; then
  printf "${TEST_FILE} still exists despite clean!\n"
  exit 1
fi
