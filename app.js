$(document).ready(function() {
      var lock = new Auth0Lock(
      // All these properties are set in auth0-variables.js
      AUTH0_CLIENT_ID,
      AUTH0_DOMAIN
    );

    var userProfile;

    $('.signin').click(function(e) {
      e.preventDefault();
      lock.show({ authParams: { scope: 'openid' } });
    });
    var hash = lock.parseHash(window.location.hash);

    if (hash) {
      if (hash.error) {
        console.log("There was an error logging in", hash.error);
        alert('There was an error: ' + hash.error + '\n' + hash.error_description);
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
      console.log("Hey dude", profile)
      console.log("userProfile is: ", userProfile)
      userProfile = profile;
      console.log("Now userProfile is: ", userProfile)
      populateDashboard();
      });
    }

    $('#fake-login').click(function(e) {
      e.preventDefault();
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
        method: 'GET'
      }).then(function(data, textStatus, jqXHR) {
        alert("API endpoint responded with " + data);
        //alert("The request to the secured enpoint was successfull");
      }, function() {
        alert("You need to download the server seed and start it to call this API");
      });
    });

    function getRoutesDashboard(){
      //  Destroy the DataTable so it can be re-initialized
      var dt = $('#dataTablesTest').DataTable();
      dt.destroy();

      $('#dashboardRoutesTable').html('');
      $('#dashboardRoutesTableLoader').show();
      if(userProfile){
        $.ajax({
          url: 'http://dnsreroutedev-dnsreroute.rhcloud.com/routes/byUserEmail/' + userProfile.email,
          dataType: 'json',
          method: 'GET'
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
            tableContent += '<td style="min-width: 100px;"><button class="btn btn-success btn-xs" style="margin-right: 3px;"><i class="fa fa-check"></i></button><button class="btn btn-primary btn-xs" style="margin-right: 3px;"><i class="fa fa-pencil"></i></button><button class="btn btn-danger btn-xs"><i class="fa fa-trash-o "></i></button></td>';
            tableContent += '</tr>';
          });
          $('#dashboardRoutesTable').html(tableContent);
          // Re-initialize the dataTable
          $('#dataTablesTest').DataTable();

        }, function() {
          alert("API call failed");
        });
      }
      else {
        alert('No user profile object - please sign in');
        $('#dashboardRoutesTableLoader').hide();
        // Re-initialize the dataTable
        $('#dataTablesTest').DataTable();
      }
    }

    function populateDashboard(){
      // for production, the conditional should be here
      // if(typeof profile !== 'undefined'){
        $('#welcome').hide();
        $('#cloakAndDagger').show();
      if(typeof userProfile !== 'undefined'){
        $('#profile-nickname').text(userProfile.nickname);
        $('.nickname').text(userProfile.name);
        $('#profile-photo').attr('src', userProfile.picture);
        getRoutesDashboard();
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

    // Bindings
    $('#dashboardRoutesRefresh').click(function(){
      getRoutesDashboard()
    })




});
