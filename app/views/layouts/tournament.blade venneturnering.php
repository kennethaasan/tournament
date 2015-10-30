<!DOCTYPE html>
<html ng-app="app">
	<head>
	    <meta charset="utf-8">
	    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
	    <meta name="description" content="Turneringsinformasjon">
	    <meta name="viewport" content="width=device-width, initial-scale=1">

	    <title>Turneringsinformasjon</title>

	    <link rel="stylesheet" href="{{ asset('bower_components/bootstrap/dist/css/bootstrap.min.black.css') }}">
	    <link rel="stylesheet" href="{{ asset('bower_components/font-awesome/css/font-awesome.min.css') }}">
	    <link rel="stylesheet" href="{{ asset('css/tournament.css') }}">

	</head>
    <body>


	    <div class="container-fluid" ng-controller="TournamentController">
	    	<p class="text-center" ng-show="loading"><span class="fa fa-spinner fa-5x fa-spin"></span></p>


	    	<div class="row" ng-hide="loading">
	    		<div class="col-md-12">
		    		<div class="panel panel-default">
						  	<div class="panel-heading"><h5 class="text-center"><% tournament.name %></h5></div>
					</div>
				</div>

	    	</div>


	    	<div class="row" ng-hide="loading">

			    <div class="col-md-6">
			    	<div class="panel panel-default">
					  	<div class="panel-heading">KAMPOPPSETT</div>

					  	<table class="table table-condensed table-striped">
					    	<thead>
					    		<tr>
					    			<th>TID</th>
					    			<th>BANE</th>
					    			<th>GRP/KAMP</th>
					    			<th>HJEMMELAG</th>
					    			<th>BORTELAG</th>
					    			<th>RESULTAT</th>
					    		</tr>
					    	</thead>
					    	<tbody>
					    		<tr ng-repeat="match in matches">
					    			<td><% match.kickoff_at | limitTo:5 %></td>
					    			<td><% match.field %></td>
					    			<td><% match.match_code %></td>
					    			<td><% match.hometeam %></td>
					    			<td><% match.awayteam %></td>
					    			<td><% match.score_home %>-<% match.score_away %></td>
					    		</tr>
					    	</tbody>
					  	</table>
					</div>
			    </div>

			    <div class="col-md-4">

			    	<div class="panel panel-default" ng-repeat="(key, table) in tables" ng-if="table.length > 0">
					  	<div class="panel-heading">TABELL - <% key %></div>

					  	<table class="table table-condensed table-striped">
					    	<thead>
					    		<tr>
					    			<th class="team">LAG</th>
					    			<th class="text-center">K</th>
					    			<th class="text-center">S</th>
					    			<th class="text-center">U</th>
					    			<th class="text-center">T</th>
					    			<th class="text-center">FOR</th>
					    			<th class="text-center">MOT</th>
					    			<th class="text-center">DIFF</th>
					    			<th class="text-center">POENG</th>
					    		</tr>
					    	</thead>
					    	<tbody>
					    		<tr ng-repeat="team in table">
					    			<td class="team"><% team.name %></td>
					    			<td class="text-center"><% team.matches %></td>
					    			<td class="text-center"><% team.victorys %></td>
					    			<td class="text-center"><% team.draws %></td>
					    			<td class="text-center"><% team.losses %></td>
					    			<td class="text-center"><% team.goals_for %></td>
					    			<td class="text-center"><% team.goals_against %></td>
					    			<td class="text-center"><% team.diff %></td>
					    			<td class="text-center"><% team.points %></td>
					    		</tr>
					    	</tbody>
					  	</table>
					</div>

			    </div>

			    <div class="col-md-2">

			    	<div class="panel panel-default" ng-if="topscorers.length > 0">
					  	<div class="panel-heading">TOPPSCORER</div>

					  	<table class="table table-condensed table-striped">
					    	<thead>
					    		<tr>
					    			<th class="player">Spiller</th>
					    			<th class="text-center">Mål</th>
					    		</tr>
					    	</thead>
					    	<tbody>
					    		<tr ng-repeat="player in topscorers">
					    			<td class="player"><% player.name %></td>
					    			<td class="text-center"><% player.goals %></td>
					    		</tr>
					    	</tbody>
					  	</table>
					</div>

			    </div>

			</div>

	    </div>

	    <script>
	    	var tournament_id = <?php echo $tournament; ?>;
	    </script>

        <!-- SAVE LOADING TIME
        <script src="{{ asset('bower_components/jquery/dist/jquery.min.js') }}"></script>
        <script src="{{ asset('bower_components/bootstrap/dist/js/bootstrap.min.js') }}"></script>
        -->
        <script src="{{ asset('bower_components/angular/angular.min.js') }}"></script>
        <script src="{{ asset('js/tournament/app.js') }}"></script>
        <script src="{{ asset('js/tournament/controllers.js') }}"></script>

    </body>
</html>
