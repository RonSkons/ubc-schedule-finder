<?php

/*
String, String -> String (JSON)

For given department and course number, produces a JSON representation of all
sections of that course, or an empty JSON string "[]" if no such course exists.
*/

$department = $_GET["dept"];
$course = $_GET["course"];
$sesscd = $_GET["sesscd"];
$sessyr = $_GET["sessyr"];

// Grab relevant course webpage
$results = file_get_contents("https://courses.students.ubc.ca/cs/courseschedule?pname=subjarea&sessyr=$sessyr&sesscd=$sesscd&tname=subj-course&dept=$department&course=$course");

$dom = new domDocument;
@$dom->loadHTML($results); // HTML is not well-formed, suppress warnings
$table = $dom->getElementsByTagName("table")[1]; //Grab the table containing all sections

$rows = $dom->getElementsByTagName("tr");

// Subtract one because first row contains labels
// Subtract two more because last two rows are just whitespace 
$rowCount = $rows->length - 3;

$sections = []; // Parsed section information will be stored here

for($i=1; $i<=$rowCount; $i++){ // Skip label row; count from 1
	$cols = $rows[$i]->getElementsByTagName('td');
	
	$sections[$i-1]["status"] = trim($cols[0]->nodeValue); //Trim excess whitespace
	$sections[$i-1]["section"] = $cols[1]->nodeValue;
	$sections[$i-1]["activity"] = $cols[2]->nodeValue;
	$sections[$i-1]["term"] = $cols[3]->nodeValue;
	$sections[$i-1]["delivery"] = trim($cols[4]->nodeValue);
	
	//"Interval" column is skipped, idk what is represents
	
	$days = trim($cols[6]->nodeValue); //Remove leading space that's there for some reason
	$sections[$i-1]["days"] = explode(" ", $days); //Sub-array with list of days
	
	//Remove colons from time values
	$start = $cols[7]->nodeValue;
	$sections[$i-1]["startTime"] = str_replace(":", "", $start);
	
	$end = $cols[8]->nodeValue;
	$sections[$i-1]["endTime"] = str_replace(":", "", $end);
	
}

//Return json representation of output
echo(json_encode($sections));

?>
