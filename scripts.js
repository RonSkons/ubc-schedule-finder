/*
Where (most of) the magic happens. User input is processed, and potential schedules are returned.
I am relatively new to JS and don't know any industry standards or best practices, this is held together with tape.
*/

const baddays = [];
var sessionstring;
const delivery = [];
var starttime;
var endtime;
var semestermax; //Default upper bound

//Main function of the program. Run when main form is submitted.
function processInputs(){
    
    //Pull user inputs from form
    const classdepts = [];
    const classnums = [];
    baddays.length = 0;
    
    //Pull class departments and numbers
    for(i=0; i<classcount; i++){
        classdepts.push(document.getElementById("dept"+i).value.toUpperCase());
        classnums.push(document.getElementById("num"+i).value.toUpperCase());
    }
    
    
    //!!! TODO: un-hardcode this. somehow.
    if(document.getElementById("winter2021").checked){
       sessionstring = "&sesscd=W&sessyr=2021";
    }else{
        sessionstring = "&sesscd=S&sessyr=2022";
    }
    
    if(document.getElementById("inperson").checked){
       delivery.push("In-Person");
    }
    if(document.getElementById("online").checked){
        delivery.push("Online");
    }
    
    if(document.getElementById("hybrid").checked){
        delivery.push("Hybrid");
    }
    
    //Pull unavailable weekdays
    for(i=0; i < 5; i++){
        box = document.getElementById("check"+i);
        if(!box.checked){
            baddays.push(box.value);
        }
    }
    
    starttime = parseInt(document.getElementById("starttime").value);
    endtime = parseInt(document.getElementById("endtime").value);
    
    //Pull class info from UBC website, things go async here for a bit until all responses come back
    for(i=0; i < classcount; i++){
        getClassInfo(classdepts[i], classnums[i]);
    }
    
    var maxcourse = Number.parseInt(document.getElementById("maxcourse").value);
    //Get max courses per semester, if specified
    if(Number.isInteger(maxcourse)){
        semestermax = maxcourse;
    }else{
        semestermax = classcount;
    }
}

//Sends a request to scrapeCourse.php to get information about sections of a specific class.
function getClassInfo(dept, num){
    var url = "scrapeCourse.php?dept="+dept+"&course="+num+sessionstring;
    
    const xmlHttp = new XMLHttpRequest();
    xmlHttp.onload = function() { 
            collectClasses(xmlHttp.responseText);
    }
    xmlHttp.open("GET", url);
    xmlHttp.send(null);
}

//Collect http responses, return to synchronous operations. Fail if a given class doesn't exist.
const sections = [];
function collectClasses(response){
    if(response.length <= 2){
        alert("At least one course could not be found. Double-check that everything was entered correctly.");
        sections.length=0; //Reset array so form can be used again
    }else{
        sections.push(JSON.parse(response, 
                                 function(k, v) { //Convert number-like strings to ints
                                                return (typeof v === "object" || isNaN(v)) ? v : parseInt(v); 
                                                }));
        if(sections.length == classcount){ //All classes found, continue on to filtering.
            filterSections(sections.slice()); //Slice a copy so that resetting sections doesn't affect this
            sections.length=0; //Reset array so form can be used again
        }
    }
}

//Filter out sections that do not meet date/time/term requirements
var filtered = [];
function filterSections(sectionlist){
    filtered = [];
    for(i = 0; i < classcount; i++){
        filtered[i] = sectionlist[i].filter(meetsCriteria);
    }
    display(solveSchedule([], 0));
}

function meetsCriteria(section){
    return  (delivery.includes(section.delivery)) &&
            (section.startTime >= starttime) && 
            (section.endTime <= endtime)&&
            //(section.status != "Blocked") && //!!! disabled for debug purposes, TODO add user controls for course status
            //(section.status != "Full") && 
            //(section.status != "Restricted") &&
            (section.status != "STT") &&
            (section.activity == "Lecture") && //Just lectures for now, !!! add proper lab/discussion support 
            (!baddays.some(day => section.days.includes(day))); //Make sure no bad days are selected
}

function display(foobar){ //!!! TODO implement
    console.log(foobar);
}


//Mutual recursion brute-force search
//A schedule is a list of courses
//Due to structure of course list, it is necessary to keep track of depth in the course list array

function solveSchedule(schedule, depth){
    if(schedule.length == classcount){ //schedule is full, return solved schedule
        return [schedule];
    }else{
       return solveListOfSchedule(nextSchedules(schedule, depth).filter(isValid), depth+1);
    }
}

function solveListOfSchedule(los, depth){
    //Split list of schedules into first and rest
    var [first, ...rest] = los;
    if(first === undefined){ //Produces true when los was empty
        return []; //Dead end, backtrack
    }else{
        return solveSchedule(first, depth).concat(solveListOfSchedule(rest, depth));
    }
}


//Helper functions
//=================
function nextSchedules(schedule, depth){
    return filtered[depth].map(course => schedule.concat([course]));
}

function isValid(schedule){
    //Check whether or not any courses conflict time-wise
    var courseConflict = schedule.some(course1 => schedule.some(course2 => hasCourseConflict(course1, course2)));
    
    //Make sure there aren't too many courses in either semester
    var term1Count = schedule.filter(course => (course.term == 1)).length;
    var term2Count = schedule.length - term1Count;
    var semesterOverflow = (term1Count > semestermax) || (term2Count > semestermax);
    
    return !courseConflict && !semesterOverflow;
}

function hasCourseConflict(course1, course2){
   if(course1.term != course2.term || hasNoIntersection(course1.days, course2.days) || course1 == course2){
        return false;
    }else if(course1.startTime >= course2.startTime && course1.startTime < course2.endTime){
        return true;  
    }else if(course1.endTime <= course2.endTime && course1.endTime > course2.startTime){
        return true;
    }else{
        return false;
    }
}

//Produce true if two arrays have no items in common
function hasNoIntersection(a1, a2){
    return !a1.some(item => a2.includes(item));
}