#!/command/with-contenv /usr/bin/bash
# shellcheck shell=bash

set -e

cd "${UNIVERSALDOCUMENTS_SRC_DIR}"

if [[ -n "${USER_IS_NON_ROOT}" ]]; then
	python3 manage.py management_command "$@"
elif [[ $(id -u) == 0 ]]; then
	s6-setuidgid universaldocuments python3 manage.py management_command "$@"
elif [[ $(id -un) == "universaldocuments" ]]; then
	python3 manage.py management_command "$@"
else
	echo "Unknown user."
	exit 1
fi
