// Global vars
var auth0Profile;
var org;
var user;
var subscriptionName;

$(document).ready(function() {
      var lock = new Auth0Lock(
      // All these properties are set in auth0-variables.js
      AUTH0_CLIENT_ID,
      AUTH0_DOMAIN
    );



    $('.signin').click(function(e) {
      e.preventDefault();
      lock.show({ authParams: { scope: 'openid' } });
    });
    var hash = lock.parseHash(window.location.hash);

    if (hash) {
      if (hash.error) {
        // Log the error quietly - if a non-logged in user browses to the page
        // hash.error will be present
        console.log("There was an error logging in", hash.error);
      } else {
        //save the token in the session:
        localStorage.setItem('id_token', hash.id_token);
      }
    }
	  //retrieve the profile:
    var id_token = localStorage.getItem('id_token');
    if (id_token) {
      lock.getProfile(id_token, function (err, profile) {
        if (err) {
          return alert('There was an error geting the profile: ' + err.message);
        }
        auth0Profile = profile;
        console.log("auth0Profile is: ", auth0Profile)

        // If this is a net new user, create a record in the users collection
        registerNewUser();

        displayAdminPanel();

        setUser(function(){
          setOrg(function(){
            populateDashboard();
          })
        });

        // populateDashboard();

      });
    }

    $('#fake-login').click(function(e) {
      e.preventDefault();
      displayAdminPanel();
      populateDashboard();
    });

    $.ajaxSetup({
      'beforeSend': function(xhr) {
        if (localStorage.getItem('id_token')) {
          xhr.setRequestHeader('Authorization',
                'Bearer ' + localStorage.getItem('id_token'));
        }
      }
    });

    $('.btn-api').click(function(e) {
      // Just call your API here. The header will be sent
      $.ajax({
        url: 'http://localhost:3001/secured/ping',
        type: 'GET'
      }).then(function(data, textStatus, jqXHR) {
        alert("API endpoint responded with " + data);
        //alert("The request to the secured enpoint was successfull");
      }, function() {
        alert("You need to download the server seed and start it to call this API");
      });
    });

    function setUser(callback){
      if(typeof auth0Profile !== 'undefined'){
        $.ajax({
          url: 'https://dnsreroutedev-dnsreroute.rhcloud.com/users/' + auth0Profile.email,
          dataType: 'json',
          type: 'GET'
        }).then(function(data, textStatus, jqXHR) {
          console.log('getUser API call succeeded')
          console.log(data);
          user = data;
          console.log('user is ' + user);
          // setOrg();
          callback();
        }, function() {
          console.log("getUser API call failed");
        });
      }
      else{
        alert('No session information - please sign in first.')
      }
    }

    function setOrg(callback){
      if(typeof user !== 'undefined'){
        $.ajax({
          url: 'https://dnsreroutedev-dnsreroute.rhcloud.com/orgs/' + user.orgId,
          dataType: 'json',
          type: 'GET'
        }).then(function(data, textStatus, jqXHR) {
          console.log('getOrg API call succeeded')
          console.log(data);
          org = data;
          console.log('org is ' + org);
          callback();
        }, function() {
          console.log("getOrg API call failed");
        });
      }
      else{
        alert('Global var user not set yet')
      }
    }

    function getRoutesPanel(){
      //  Destroy the DataTable so it can be re-initialized
      var dt = $('#routesDataTable').DataTable();
      dt.destroy();

      $('#dashboardRoutesTable').html('');
      $('#dashboardRoutesTableLoader').show();
      if(auth0Profile){
        $.ajax({
          url: 'https://dnsreroutedev-dnsreroute.rhcloud.com/routes/byUserEmail/' + auth0Profile.email,
          dataType: 'json',
          type: 'GET'
        }).then(function(data, textStatus, jqXHR) {
          // console.log(data);
          $('#dashboardRoutesTableLoader').hide();
          var tableContent = '';
          $.each(data, function(i, route){
            // console.log("This route is: ", route)
            tableContent += '<tr>';
            tableContent += '<td>';
            tableContent += route.incomingRoute;
            tableContent += '</td>';
            tableContent += '<td>';
            tableContent += route.outgoingRoute;
            tableContent += '</td>';
            tableContent += '<td>';
            tableContent += route.type;
            tableContent += '</td>';
            tableContent += '<td><span class="label label-success label-mini">Healthy</span></td>';
            tableContent += '<td style="min-width: 100px;"><button class="btn btn-success btn-xs" style="margin-right: 3px;"><i class="fa fa-check"></i></button><button class="btn btn-primary btn-xs" style="margin-right: 3px;"><i class="fa fa-pencil"></i></button><button class="btn btn-danger btn-xs deleteRoute" incomingRoute="' + route.incomingRoute + '"><i class="fa fa-trash-o "></i></button></td>';
            tableContent += '</tr>';
          });

          $(document).off('click', '.deleteRoute');
          $(document).on('click', '.deleteRoute', function(){
            deleteRoute(
              $(this).attr('incomingRoute')
            )
          });

          $('#dashboardRoutesTable').html(tableContent);
          // Re-initialize the dataTable
          $('#routesDataTable').DataTable();

        }, function() {
          console.log("API call failed");
        });
      }
      else {
        alert('No session information - please sign in first.')
        $('#dashboardRoutesTableLoader').hide();
        // Re-initialize the dataTable
        $('#routesDataTable').DataTable();
      }
    }

    function populateBillingPanel(){
      if(typeof auth0Profile !== 'undefined'){
        $.ajax({
          url: 'https://dnsreroutedev-dnsreroute.rhcloud.com/subscriptions/' + org.subscription,
          dataType: 'json',
          type: 'GET'
        }).then(function(data, textStatus, jqXHR) {
          console.log('populateBillingPanel API call succeeded')
          console.log(data);
          $('#subscriptionTitle').text(data.title);
          $('#subscriptionDetailsTable').html(data.table)
        }, function() {
          console.log("API call failed");
        });
      }
      else{
        alert('No session information - please sign in first.')
      }
    }

    function displayAdminPanel(){
      $('#welcome').hide();
      $('#pageFrame').show();
    }

    function populateDashboard(){
      // for production, the conditional should be here
      // if(typeof profile !== 'undefined'){
      $('#dashboardPage').show();
      if(typeof auth0Profile !== 'undefined'){
        $('#profile-nickname').text(auth0Profile.nickname);
        $('.nickname').text(auth0Profile.name);
        $('#profile-photo').attr('src', auth0Profile.picture);
        $.ajax({
          url: 'https://dnsreroutedev-dnsreroute.rhcloud.com/users/' + auth0Profile.email,
          dataType: 'json',
          type: 'GET'
        }).then(function(data, textStatus, jqXHR) {
          console.log(data);
          $('.orgIdHiddenInput').val(data.orgId);
        }, function() {
          console.log("API call failed");
        });

        getRoutesPanel();
        populateBillingPanel();
      }
      else {
        alert('No session information - please sign in first.')
      }

    }

    $('.signout').click(function(){
      if (localStorage.getItem('id_token') !== null) {
        localStorage.removeItem('id_token');
      }
      window.location.href = 'dnsreroute-console.html';
    })


    function registerNewUser(){
      console.log('registerNewUser function triggered');
      $.ajax({
        url: 'https://dnsreroutedev-dnsreroute.rhcloud.com/users/' + auth0Profile.email,
        dataType: 'json',
        type: 'GET'
      }).then(function(data, textStatus, jqXHR) {
        console.log('User already exists');
        console.log(data);
      }, function() {
        console.log("User doesn't exist locally yet, adding it to users collection");


        $.ajax({
          url: 'https://dnsreroutedev-dnsreroute.rhcloud.com/users',
          dataType: 'json',
          type: 'POST',
          data: {
            'userEmail': auth0Profile.email,
            userName: auth0Profile.email,
            subscription: 'freeTier'
          }
        }).then(function(data, textStatus, jqXHR) {
          console.log('User successfully added to users collection');
          console.log(data);

          // Now that the user record exists, set user and org elements
          setUser(function(){
            setOrg(function(){
              populateDashboard();
            })
          });
        }, function() {
          console.log("Failed to add user to users collection");
        });


      });
    }

    function deleteRoute(incomingRoute){
      console.log('deleteRoute function triggered');
      console.log(incomingRoute);
      if(auth0Profile){
        $.ajax({
          url: 'https://dnsreroutedev-dnsreroute.rhcloud.com/routes/' + incomingRoute,
          dataType: 'json',
          type: 'DELETE'
        }).then(function(data, textStatus, jqXHR) {
          console.log('Successfully deleted route ' + incomingRoute);
          getRoutesPanel();
        }, function() {
          console.log("API call failed");
        });

      }
      else {
        console.log('No user profile object - please sign in');
      }
    }

    function createRoute(){
      console.log('createRoute function triggered');
      // var incomingRoute = $(this).attr('id');
      if(auth0Profile){
        formData = $('#addRouteForm').serialize();
        $.ajax({
          url: 'https://dnsreroutedev-dnsreroute.rhcloud.com/routes',
          dataType: 'json',
          data: formData,
          type: 'POST'
        }).done(function(data, textStatus, jqXHR) {
          // console.log(data);
          console.log('Successfully created route');
          console.log(data);
          $('#addRouteForm').find("input[type=text]").val("");
          gritterWrapper('Created route', "You're new route was created successfully!", 'green-check-200px.png');
          getRoutesPanel();
        }).fail(function(jqXHR, textStatus, errorThrown){
          var responseJSON = JSON.parse(jqXHR.responseText);
          if(responseJSON['message'] == 'Failed to add route - that incoming DNS name is already in use'){
            // alert('That incoming route is already in use. Please use a different incoming DNS name.');
            gritterWrapper('Failed to create route', "That incoming route is already in use. Please use a different incoming DNS name.", 'red-x-200px.png');
          }
          else{
            alert('Error when calling backend API')
          }
        })

        // }, function() {
        //   if
        //   console.log("API call failed");
        // });
      }
      else {
        alert('No session information - please sign in first.')
      }
    }

    function populateSubscriptionsPage(){
      hideAllPages();
      $('#subscriptionsPage').show();
      if(org.subscription == 'freeTier'){
        $('#freeTierSelected').show();
        $('#freeTierPanel').addClass('blue-panel').removeClass('white-panel');
        $('#freeTierHeader').addClass('blue-header').removeClass('white-header');
        // Revert other panels to un-selected state
        $('#developerTierSelected').hide();
        $('#developerTierPanel').addClass('white-panel').removeClass('blue-panel');
        $('#developerTierHeader').addClass('white-header').removeClass('blue-header');
        $('#enterpriseTierSelected').hide();
        $('#enterpriseTierPanel').addClass('white-panel').removeClass('blue-panel');
        $('#enterpriseTierHeader').addClass('white-header').removeClass('blue-header');
        $('#switchToFree').hide();

        $('#switchToDeveloper').show();
        $('#switchToEnterprise').show();
      }
      else if(org.subscription == 'developerTier'){
        $('#developerTierSelected').show();
        $('#developerTierPanel').addClass('blue-panel').removeClass('white-panel');
        $('#developerTierHeader').addClass('blue-header').removeClass('white-header');
        // Revert other panels to white in case they were blue before
        $('#freeTierSelected').hide();
        $('#freeTierPanel').addClass('white-panel').removeClass('blue-panel');
        $('#freeTierHeader').addClass('white-header').removeClass('blue-header');
        $('#enterpriseTierSelected').hide();
        $('#enterpriseTierPanel').addClass('white-panel').removeClass('blue-panel');
        $('#enterpriseTierHeader').addClass('white-header').removeClass('blue-header');
        $('#switchToDeveloper').hide();

        $('#switchToFree').show();
        $('#switchToEnterprise').show();
      }
      else if(org.subscription == 'enterpriseTier'){
        $('#enterpriseTierSelected').show();
        $('#enterpriseTierPanel').addClass('blue-panel').removeClass('white-panel');
        $('#enterpriseTierHeader').addClass('blue-header').removeClass('white-header');
        // Revert other panels to white in case they were blue before
        $('#freeTierSelected').hide();
        $('#freeTierPanel').addClass('white-panel').removeClass('blue-panel');
        $('#freeTierHeader').addClass('white-header').removeClass('blue-header');
        $('#developerTierSelected').hide();
        $('#developerTierPanel').addClass('white-panel').removeClass('blue-panel');
        $('#developerTierHeader').addClass('white-header').removeClass('blue-header');
        $('#switchToEnterprise').hide();

        $('#switchToFree').show();
        $('#switchToDeveloper').show();
      }
    }

    function hideAllPages(){
      $('#welcome').hide();
      $('#dashboardPage').hide();
    }



    // Bindings
    $('#dashboardRoutesRefresh').click(function(){
      getRoutesPanel()
    })

    $('#addRouteBtn').click(function(){
      createRoute()
    })

    $('#navSubscriptions').click(function(){
      populateSubscriptionsPage();
    })

    $('#btnUpgrade').click(function(){
      $('#navDashboard').removeClass('active');
      $('#navSubscriptions').addClass('active');
      populateSubscriptionsPage();
    })

    function gritterWrapper(title, text, image){
      var unique_id = $.gritter.add({
            // (string | mandatory) the heading of the notification
            title: title,
            // (string | mandatory) the text inside the notification
            text: text,
            // (string | optional) the image to display on the left
            image: 'assets/img/' + image,
            // (bool | optional) if you want it to fade out on its own or just sit there
            sticky: false,
            // (int | optional) the time you want it to be alive (in milliseconds?) for before fading out
            time: '7000'
            // (string | optional) the class name you want to apply to that specific message
            // class_name: 'my-sticky-class'
        });
    }


  //////////////////////////////////////////////////////////////////////
  //  Stripe JS
  //////////////////////////////////////////////////////////////////////
  var handler = StripeCheckout.configure({
    key: 'pk_test_QrccwnKa5qKT2IxMPxRwykD9',
    // image: '/img/documentation/checkout/marketplace.png',
    locale: 'auto',
    zipCode: true,
    token: function(token) {
      // You can access the token ID with `token.id`.
      // Get the token ID to your server-side code for use.
      if(auth0Profile){
        // alert('tokenId is ' + token.id);
        // console.log('tokenId is ' + token.id);
        // alert('userEmail is ' + auth0Profile.email);
        // alert('subscription is ' + 'developerTier')
        $('#subscriptionsPageLoader').show();
        $.ajax({
          url: 'https://dnsreroutedev-dnsreroute.rhcloud.com/orgs/' + org._id + '/subscription',
          dataType: 'json',
          data: {
            "tokenId": token.id,
            "userEmail": auth0Profile.email,
            "subscription": subscriptionName
          },
          type: 'PUT'
        }).done(function(data, textStatus, jqXHR) {
          // console.log(data);
          console.log('Successfully sent Stripe data to server');
          console.log(data);
          $('#subscriptionsPageLoader').hide();
          org.subscription = subscriptionName;
          populateSubscriptionsPage();

        }).fail(function() {
          $('#subscriptionsPageLoader').hide();
          gritterWrapper('API Error', "API call failed while trying to send Stripe data to server", "red-x-200px.png");
          console.log("API call failed while trying to send Stripe data to server");
        });
      }
      else {
        alert('No session information - please sign in first.')
      }
    }
  });

  $('.upgradeButton').on('click', function(e) {
    if($(this).attr('id') == 'switchToDeveloper'){
      // Update global variable
      subscriptionName = 'developerTier';
      // Open Checkout with further options:
      handler.open({
        name: 'DNSReRoute.xyz',
        description: 'Developer Tier',
        amount: 200
      });
    }
    else if($(this).attr('id') == 'switchToEnterprise'){
      // Update global variable
      subscriptionName = 'enterpriseTier';
      // Open Checkout with further options:
      handler.open({
        name: 'DNSReRoute.xyz',
        description: 'Enterprise Tier',
        amount: 2000
      });
    }
    else if($(this).attr('id') == 'switchToFree'){
      // Update global variable
      subscriptionName = 'freeTier';
      // Open Checkout with further options:
      handler.open({
        name: 'DNSReRoute.xyz',
        description: 'Free Tier',
        amount: 0
      });
    }
    e.preventDefault();
  });

  // Close Checkout on page navigation:
  $(window).on('popstate', function() {
    handler.close();
  });
  //////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////



}); //End of document.ready block?
