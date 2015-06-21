/**
 * Created by sikkar on 6/16/2015.
 */
function listFiles(relurlpath) {
    // Send a GET request to get list of all the files
    xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", relurlpath, false);
    xmlhttp.send();
    // Parse the list
    xmlDoc = xmlhttp.responseText;
    obj = JSON.parse(xmlDoc);
    // Create hyperlinks to the files and display in browser
    for (num = 0; num < obj.length; num = num + 1) {
        name = obj[num].name;
        link = document.createElement('a');
        link.textContent = name;
        link.href = relurlpath + name;
        document.body.appendChild(link);
        para = document.createElement("P");
        document.body.appendChild(para);
    }
}