/*
Where (most of) the magic happens. User input is processed, and potential schedules are returned.
I am relatively new to JS and don't know any industry standards or best practices, this is held together with tape.
*/

const baddays = [];
var sessionString;
var delivery; //!!! TODO Support for multiple modes, + hybrid
var starttime;
var endtime;

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
       sessionString = "&sesscd=W&sessyr=2021";
    }else{
        sessionString = "&sesscd=S&sessyr=2022";
    }
    
    if(document.getElementById("inperson").checked){
       delivery = "In-Person";
    }else{
        delivery = "Online";
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
}

//Sends a request to scrapeCourse.php to get information about sections of a specific class.
function getClassInfo(dept, num){
    var url = "scrapeCourse.php?dept="+dept+"&course="+num+sessionString;
    
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
    return  (section.delivery == delivery) &&
            (section.startTime >= starttime) && 
            (section.endTime <= endtime)&&
            //(section.status != "Blocked") && 
            //(section.status != "Full") &&
            //(section.status != "Restricted") &&
            //(section.status != "STT") &&
            (section.activity == "Lecture") && //Just lectures for now, !!! add proper lab/discussion support 
            (!baddays.some(day => section.days.includes(day))); //Make sure no bad days are selected
}

function display(foobar){ //!!! TODO implement
    console.log(foobar);
}



//Mutual recursion brute-force search
//A schedule is a list of courses
//Due to structure of course list, it is necessary to keep track of depth in the course list array

//!!! TODO multiple solutions
function solveSchedule(schedule, depth){
    if(schedule.length == classcount){ //schedule is full, return solved schedule
        return schedule;
    }else{
       return solveListOfSchedule(nextSchedules(schedule, depth).filter(hasNoConflict), depth+1);
    }
}

function solveListOfSchedule(los, depth){
    //Split list of schedules into first and rest
    first = los.shift();
    rest = los;
    if(first === undefined){ //Produces true when los was empty before shift()
        return false; //Dead end, backtrack
    }else{
        trycatch = solveSchedule(first, depth);
        
        if(trycatch !== false){
            return trycatch;
        }else{
            return solveListOfSchedule(rest, depth);
        }
    }
}

//Helper functions
function nextSchedules(schedule, depth){
    return filtered[depth].map(course => schedule.concat([course]));
}

function hasNoConflict(schedule){
    return !schedule.some(course1 => schedule.some(course2 => hasCourseConflict(course1, course2)));
}

function hasCourseConflict(course1, course2){
    if(course1 == course2 || course1.semester != course2.semester){
        return false;
    }else if(course1.startTime >= course2.startTime && course1.startTime < course2.endTime){
        return true;  
    }else if(course2.startTime >= course1.startTime && course2.startTime < course1.endTime){
        return true;
    }else{
        return false
    }
}