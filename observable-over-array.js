const { Observable, BehaviorSubject, Subject } = require('rxjs');

const inbox = new Subject({"message": "Some Initial Text"});

var stage_1 = inbox.subscribe((message) => console.log(message));

inbox.next({"message": "Some other text"});

stage_1.unsubscribe();

const stage_2 = inbox.subscribe((message) => console.log("Version2 ", JSON.stringify(message)));

inbox.next({"message": "Latest Subject"});
