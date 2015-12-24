<!DOCTYPE html>
<html ng-app="app">
	<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
    <meta name="description" content="">
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <title>Turnering Admin</title>

    <link rel="stylesheet" href="{{ asset('bower_components/bootstrap/dist/css/bootstrap.min.css') }}">
    <link rel="stylesheet" href="{{ asset('bower_components/font-awesome/css/font-awesome.min.css') }}">
    <link rel="stylesheet" href="{{ asset('bower_components/angular-ui-select/dist/select.css') }}">
    <link rel="stylesheet" href="{{ asset('css/main.css') }}">

	</head>
	<body>

    <div class="navbar navbar-default navbar-fixed-top" role="navigation">
		<div class="container">
			<div class="navbar-header">
				<button type="button" class="navbar-toggle collapsed" data-toggle="collapse" data-target="#navbar" aria-expanded="false" aria-controls="navbar">
					<span class="sr-only">Toggle navigation</span>
					<span class="icon-bar"></span>
					<span class="icon-bar"></span>
					<span class="icon-bar"></span>
				</button>
			  	<a class="navbar-brand" href="#turneringer">Turnering</a>
			</div>
			<div id="navbar" class="collapse navbar-collapse" ng-controller="HeaderController">
				<ul class="nav navbar-nav">
          <li ng-class="{ active: isActive('/turneringer')}"><a href="#turneringer">Turneringer</a></li>
          <li ng-class="{ active: isActive('/lag')}"><a href="#lag">Lag</a></li>
          <li ng-class="{ active: isActive('/spillere')}"><a href="#spillere">Spillere</a></li>
          <li ng-class="{ active: isActive('/maal')}"><a href="#maal">Mål</a></li>
				</ul>
				<ul class="nav navbar-nav navbar-right">
					<li>{{ link_to_route('logout', 'Logg ut') }}</li>
				</ul>
	        </div>
		</div>
    </div>


    <div class="container" ng-view></div>


    <div class="container">
		<hr>
		<footer>
    	<p class="text-center">&copy; Vanvik IL</p>
      </footer>
    </div> <!-- /container -->


    <script src="{{ asset('bower_components/jquery/dist/jquery.min.js') }}"></script>
    <script src="{{ asset('bower_components/bootstrap/dist/js/bootstrap.min.js') }}"></script>
    <script src="{{ asset('bower_components/angular/angular.min.js') }}"></script>
    <script src="{{ asset('js/app.js') }}"></script>
    <script src="{{ asset('js/controllers.js') }}"></script>
    <script src="{{ asset('js/services.js') }}"></script>
    <script src="{{ asset('js/directives.js') }}"></script>
    <script src="{{ asset('js/filters.js') }}"></script>
    <script src="{{ asset('bower_components/angular-resource/angular-resource.min.js') }}"></script>
    <script src="{{ asset('bower_components/angular-route/angular-route.min.js') }}"></script>
    <script src="{{ asset('bower_components/angular-sanitize/angular-sanitize.min.js') }}"></script>
    <script src="{{ asset('bower_components/angular-bootstrap/ui-bootstrap.min.js') }}"></script>
    <script src="{{ asset('bower_components/angular-ui-select/dist/select.js') }}"></script>

    <script src="{{ asset('js/main.js') }}"></script>

  </body>
</html>
