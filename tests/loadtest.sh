#!/bin/bash
echo "Installing JMeter..."
apt-get -y install jmeter

test_dir=tests
test_script=${test_dir}/load.jmx
results_file=${test_dir}/load.jtl
log_file=${test_dir}/jmeter.log

# We expect to run from the project directory
if [ -f ${test_script} ]; then
	project_location="$(pwd)"
	echo "Project location determined to be ${project_location}"
else
	echo -e "${red}JMeter test script not found at ${test_script}.  Could not determine project location.${no_color}"
	exit 1
fi

# Clean up the last log file if it exists
if [ -f ${results_file} ]; then
	rm -f ${results_file}
fi
if [ -f ${log_file} ]; then
	rm -f ${log_file}
fi

echo "Running JMeter load test..."
jmeter -n -JprojectLocation=${project_location} -t ${test_script} -l ${results_file} -j ${log_file}

echo "JMeter log:"
cat -A ${log_file}
echo
echo "Test results:"
cat -A ${results_file}

errors="$(grep -c .*,.*,.*,.*,.*,.*,.*,false,.*,.* tests/load.jtl)"
if [ errors != 0 ]; then
	echo -e "${red}Load test failed.  ${errors} errors were found.${no_color}"
	exit 1
fi
