$(document).ready(function (){
// --------------------- ON LOAD EVENTS - START ---------------------
    // Initialize Firebase
    var config = {
        apiKey: "AIzaSyAYkl5opTyW9YF7801KmgT9YUhpV0JhYGY",
        authDomain: "notas-xtm-fixc.firebaseapp.com",
        databaseURL: "https://notas-xtm-fixc.firebaseio.com",
        projectId: "notas-xtm-fixc",
        storageBucket: "notas-xtm-fixc.appspot.com",
        messagingSenderId: "768789228246"
    };

    firebase.initializeApp(config);
    var database = firebase.database();

    //Sets the date for the new tickets to now; SAVE BUTTON SHOULD SAVE WITH HOUR
    $('#new-ticket-date-now').val(moment().format("dddd, D MMMM 'YY, h:mm a"));
    $('#new-ticket-date-now').prop('disabled', true);
// --------------------- ON LOAD EVENTS -   END ---------------------
//-----------------
// --------------------- GLOBAL VARIABLES - START ---------------------
    //GLOBAL VARIABLES
    //Patch to fix firebase's ascending order only problem
    var startDate = moment('1990-04-26T10:15:00'); 
    var nowDate = moment().format();
    var descOrder = -Math.abs(startDate.diff(nowDate, 'seconds'));

    //Hide/unhide booleans
    var minimizeCustData = false;
    var minimizeEquipData = false;
    
    var mostRecentTicketNum;

    //ticket data
    var ticketDBID;
    var location;
    var fullTicketNum;
    var shortTicketNum
    var date;

    //cust data
    var custDBID;
    var custName;
    var custLastName;
    var cellNum;
    var email;
    var zipCode;
    var contactMetCall;
    var contactMetWhats;
    var contactMetEmail;
    
    //equipment data
    var eqType;
    var eqBrand;
    var eqModel;
    var eqSerialNum;
    var characteristics;
    var accesories;
    var reasonToVisit;

    //GLOBAL SELECTORS
    //buttons
    var saveExistCustButton = $('#save-exist-customer-button');
    saveExistCustButton.hide(); //only activated when a cust exists and we want to modify it
    var saveNewCustButton = $('#save-new-customer-button');
    saveNewCustButton.hide(); //only activated when a cust exists and we want to modify it
    var confCustButton = $('#confirm-customer-button');
    var modCustButton = $('#modify-customer-button');
    var addTicketButton = $('#add-ticket-button');

    //containers
    var validateCustBox = $('#validate-customer-exists');
    var custInfoBox = $('#customer-information');
    custInfoBox.hide();
    var eqInfoBox = $('#equipment-information');
    eqInfoBox.hide();
    var ticketDataBox = $('#ticket-data');
    ticketDataBox.hide();

    //Information fields (inputs, checks, etc...)
    var custNameSelector = $('#cust-name');
    var custLastNameSelector = $('#cust-last-name');
    var cellNumSelector = $('#cellphone-number');
    var emailSelector = $('#email');
    var zipCodeSelector = $('#zip-code');
    var contactMetCallSelector = $('#contact-call');
    var contactMetWhatsSelector = $('#contact-whats');
    var contactMetEmailSelector = $('#contact-email');

    var locationSelector = $('#location-select');
    var ticketNumSelector = $('#ticket-number');
    var dateSelector = $('#new-ticket-date-now');

    var eqTypeSelector = $('#equipment-type');
    var eqBrandSelector = $('#equipment-brand');
    var eqModelSelector = $('#equipment-model');
    var eqSerialNumSelector = $('#equipment-serial-number');
    var characteristicsSelector = $('#equipment-characteristics');
    var accesoriesSelector = $('#equipment-accesories');
    var reasonToVisitSelector = $('#equipment-reason');

// --------------------- GLOBAL VARIABLES -   END ---------------------
//-----------------
// --------------------- EVENT LISTENERS - START ---------------------

    //Click listeners for hiding containers as clicks are done on the respective boxes
    $('.minimize-cust-data-click').on('click', minCustData);
    $('.minimize-equipment-data-click').on('click', minEquipData);

    //Click listener for the validate customer button
    $('#validate-customer-button').on('click', queryFirebaseCellNum);

    //Click listeners for the customer's data buttons (confirm, modify and save)
    confCustButton.on('click', confCustData);
    modCustButton.on('click', modCustData);
    saveExistCustButton.on('click', saveExistCustData);
    saveNewCustButton.on('click', saveNewCustData);
    //Click listener to save the form's data to FireBase
    addTicketButton.on('click', createTicket);

    //Change listener to apply the 1st character of the new ticket number
    locationSelector.on('change', function() {
        location = this.value;
        getLatestTicketNum();
    });

// --------------------- EVENT LISTENERS -   END ---------------------
//-----------------
// --------------------- FUNCTIONS - START ---------------------

    //Query Firebase for the phone number
    function queryFirebaseCellNum() {
        $('#validate-customer-button').addClass('is-loading');
        var phoneNumToValidate = $('#cellphone-number-validate').val().trim();

        database.ref('customers')
        .orderByChild('cellNum')
        .equalTo(phoneNumToValidate)
        .once('value')
        .then(function(snapshot) {
            if(snapshot.val()) {
                //customer exists in DB
                snapshot.forEach(function(snapshotChild) { //Carefull, not validating for repeated phone numbers, could do that when customer is being added?
                custDBID = snapshotChild.key;
                viewOrCreateCustomer(snapshotChild.val());
            })
            } else {
                //customer doesn't exist in DB
                viewOrCreateCustomer();
            }
        });
    }

    //Receives the either nothing or the customer to paint it on the screen
    function viewOrCreateCustomer(pFirebaseVal) {
        validateCustBox.hide('slow');
        custInfoBox.show();
        if(pFirebaseVal) {
            //Logic for customer exists
            custNameSelector.val(pFirebaseVal.custName);
            custLastNameSelector.val(pFirebaseVal.custLastName);
            cellNumSelector.val(pFirebaseVal.cellNum);
            emailSelector.val(pFirebaseVal.email);
            zipCodeSelector.val(pFirebaseVal.zipCode);
            if (pFirebaseVal.contactMethods.whats) {
                contactMetWhatsSelector.prop('checked', true);
            } else {
                contactMetWhatsSelector.prop('checked', false);
            }
            if (pFirebaseVal.contactMethods.call) {
                contactMetCallSelector.prop('checked', true);
            } else {
                contactMetCallSelector.prop('checked', false);
            }
            if (pFirebaseVal.contactMethods.email) {
                contactMetEmailSelector.prop('checked', true);
            } else {
                contactMetEmailSelector.prop('checked', false);
            }

        } else {
            modCustData($('#cellphone-number-validate').val().trim());
        }
    }

    //Modifies fields to let the user change customer's data
    function modCustData(pPhoneNum) {
        //if the function is called because a customer exists and wants to be modified it receives an object
        //if the function is called because a customer doesn't exist, prefill the phone number it is received
        if(typeof(pPhoneNum) == 'object') {
            //hide/show buttons as needed
            modCustButton.hide();
            confCustButton.hide();
            saveExistCustButton.show();
        } else {
            cellNumSelector.val(pPhoneNum);
            //hide/show buttons as needed
            modCustButton.hide();
            confCustButton.hide();
            saveExistCustButton.hide();
            saveNewCustButton.show();
        } 

        //remove the 'disabled' prop from customer fields
        cellNumSelector.prop('disabled', false);
        emailSelector.prop('disabled', false);
        custNameSelector.prop('disabled', false);
        custLastNameSelector.prop('disabled', false);
        zipCodeSelector.prop('disabled', false);
        contactMetWhatsSelector.prop('disabled', false);
        contactMetCallSelector.prop('disabled', false);
        contactMetEmailSelector.prop('disabled', false);
    }

    //customer exists in DB and info is correct, proceed with ticket creation
    function confCustData() {
        minCustData();
        ticketDataBox.show();
        eqInfoBox.show();
    }

    //customer exists in DB and info has been modified, save cust
    function saveExistCustData() {
        //Get data from inputs
        custName = custNameSelector.val().trim();
        custLastName = custLastNameSelector.val().trim();
        cellNum = cellNumSelector.val().trim();
        email = emailSelector.val().trim();
        zipCode = zipCodeSelector.val().trim();
        contactMetCall = contactMetCallSelector[0].checked;
        contactMetEmail = contactMetEmailSelector[0].checked;
        contactMetWhats = contactMetWhatsSelector[0].checked;


        database.ref('/customers')
        .child(custDBID)
        .update({
            custName: custName,
            custLastName: custLastName,
            cellNum: cellNum,
            email: email,
            zipCode: zipCode
        })
        .then(database.ref('/customers')
        .child(custDBID + '/contactMethods')
        .update({
            whats: contactMetWhats,
            call: contactMetCall,
            email: contactMetEmail
        }), function(error){
            if(error) {
                console.log('The update failed', error);
            }
        })
        .then( function() {
            modCustButton.show();
            confCustButton.show();
            saveExistCustButton.hide();

            //remove the 'disabled' prop from customer fields
            cellNumSelector.prop('disabled', true);
            emailSelector.prop('disabled', true);
            custNameSelector.prop('disabled', true);
            custLastNameSelector.prop('disabled', true);
            zipCodeSelector.prop('disabled', true);
            contactMetWhatsSelector.prop('disabled', true);
            contactMetCallSelector.prop('disabled', true);
            contactMetEmailSelector.prop('disabled', true);
        })
    }

    //customer doesn't exist in DB, create new customer
    function saveNewCustData() {
        //Get data from inputs
        custName = custNameSelector.val().trim();
        custLastName = custLastNameSelector.val().trim();
        cellNum = cellNumSelector.val().trim();
        email = emailSelector.val().trim();
        zipCode = zipCodeSelector.val().trim();
        contactMetCall = contactMetCallSelector[0].checked;
        contactMetEmail = contactMetEmailSelector[0].checked;
        contactMetWhats = contactMetWhatsSelector[0].checked;

        custDBID = database.ref().child('customers').push().key;

        database.ref('/customers')
        .child(custDBID)
        .set({
            custID: custDBID,
            custName: custName,
            custLastName: custLastName,
            cellNum: cellNum,
            email: email,
            zipCode: zipCode,
            descOrder: descOrder,
            dateAdded: firebase.database.ServerValue.TIMESTAMP
        })
        .then(
            database.ref('/customers')
            .child(custDBID + '/contactMethods')
            .set(
                {
                whats: contactMetWhats,
                call: contactMetCall,
                email: contactMetEmail
                }), 
                function(error){
                    if(error) {
                        console.log('The creation of the new customer failed', error);
                    }
                }
            )
        .then( 
            function() {
                modCustButton.show();
                confCustButton.show();
                saveExistCustButton.hide();
                saveNewCustButton.hide();

                //add the 'disabled' prop to customer fields
                cellNumSelector.prop('disabled', true);
                emailSelector.prop('disabled', true);
                custNameSelector.prop('disabled', true);
                custLastNameSelector.prop('disabled', true);
                zipCodeSelector.prop('disabled', true);
                contactMetWhatsSelector.prop('disabled', true);
                contactMetCallSelector.prop('disabled', true);
                contactMetEmailSelector.prop('disabled', true);
            }
        )
    }

    function createTicket() {
        location = locationSelector.val().trim();
        fullTicketNum = ticketNumSelector.val().trim();
        date = dateSelector.val().trim();

        eqType = eqTypeSelector.val().trim();
        eqBrand = eqBrandSelector.val().trim();
        eqModel = eqModelSelector.val().trim();
        eqSerialNum = eqSerialNumSelector.val().trim();
        characteristics = characteristicsSelector.val().trim();
        accesories = accesoriesSelector.val().trim();
        reasonToVisit = reasonToVisitSelector.val().trim();

        ticketDBID = database.ref().child('tickets').push().key;

        getLatestTicketNum();

        database.ref('/tickets')
        .child(ticketDBID)
        .set({
            custID: custDBID,
            custName: custName,
            custLastName: custLastName,

            location: location,
            fullTicketNum: fullTicketNum,
            shortTicketNum: shortTicketNum,
            date: date,

            eqType: eqType,
            eqBrand: eqBrand,
            eqModel: eqModel,
            eqSerialNum: eqSerialNum,
            characteristics: characteristics,
            accesories: accesories,
            reasonToVisit: reasonToVisit,
            internalNotesCounter: 0,

            descOrder: descOrder,
            dateAdded: firebase.database.ServerValue.TIMESTAMP
        })
        .then(
            database.ref('/customers')
            .child(custDBID + '/tickets/' + ticketDBID)
            .set({
                ticketID: ticketDBID,
                dateAdded: firebase.database.ServerValue.TIMESTAMP
            })
        ).then(goToSearch);
    }

    function getLatestTicketNum() {
        database.ref('/tickets')
        .limitToLast(1)
        .once('child_added', function(snapshot){
            mostRecentTicketNum = snapshot.val().shortTicketNum;
            if(!mostRecentTicketNum) {
                mostRecentTicketNum = 1
            }
        }).then(setTicketNumber);
    }

    function setTicketNumber() {
        var dateForTicket = moment().format("YYMM-");
        shortTicketNum = mostRecentTicketNum+1;
        if (location == 'Avanta') {
            ticketNumSelector.val('A-'+ dateForTicket + shortTicketNum);
        } else if (location == 'Brisas') {
            ticketNumSelector.val('B-'+ dateForTicket + shortTicketNum);
        } else if (location == 'Sienna') {
            ticketNumSelector.val('S-'+ dateForTicket + shortTicketNum);
        }
    }

    //

    //Minimize Customer Data Container
    function minCustData() {
        if (!minimizeCustData) {
            $('.minimize-cust-data').hide();
            $('#cust-data-svg').removeClass('fa-minus-circle');
            $('#cust-data-svg').addClass('fa-plus-circle');
            minimizeCustData = true;
        } else {
            $('.minimize-cust-data').show();
            $('#cust-data-svg').removeClass('fa-plus-circle');
            $('#cust-data-svg').addClass('fa-minus-circle');
            minimizeCustData = false;
        }
    }

    //Minimize Equipment Data Container
    function minEquipData() {
        if (!minimizeEquipData) {
            $('.minimize-equipment-data').hide();
            $('#equipment-data-svg').removeClass('fa-minus-circle');
            $('#equipment-data-svg').addClass('fa-plus-circle');
            minimizeEquipData = true;
        } else {
            $('.minimize-equipment-data').show();
            $('#equipment-data-svg').removeClass('fa-plus-circle');
            $('#equipment-data-svg').addClass('fa-minus-circle');
            minimizeEquipData = false;
        }
    }

    function goToSearch() {
        /*
            Take the user to the search page (for local work)
        */
        var oldURL = window.location.href;
        var newURL = oldURL.replace("index", "search");
        window.location.replace(newURL);
        

        /*
            Take the user to the search page (for Git online work)
        window.location.href = 'search.html';
        */
        
    }
// --------------------- FUNCTIONS -   END ---------------------
});