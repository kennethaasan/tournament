<!DOCTYPE html>
<html ng-app="app">
    <head>
        <meta charset="utf-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
        <title>@yield('title', 'Turnering')</title>
        <meta name="description" content="">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <link rel="stylesheet" href="{{ asset('bower_components/bootstrap/dist/css/bootstrap.min.css') }}">
	    <link rel="stylesheet" href="{{ asset('css/main.css') }}">
	    

    </head>
    <body>

    <div class="navbar navbar-default navbar-fixed-top" role="navigation">
		<div class="container">
			<div class="navbar-header">
				<button type="button" class="navbar-toggle" data-toggle="collapse" data-target=".navbar-collapse">
					<span class="sr-only">Toggle navigation</span>
					<span class="icon-bar"></span>
					<span class="icon-bar"></span>
					<span class="icon-bar"></span>
				</button>
			  	{{ link_to_route('home', 'Turnering', null, ['class' => 'navbar-brand']) }}
			</div>
			<div id="navbar" class="collapse navbar-collapse">
				<ul class="nav navbar-nav">
					@if (Auth::check())
						@if (Auth::user()->admin)
							<li>{{ link_to_action('home', 'Hjem') }}</li>
						@else
							<li>{{ link_to_action('home', 'Hjem') }}</li>
						@endif
					@endif
				</ul>
				<ul class="nav navbar-nav navbar-right">
					@if (Auth::check())
						<li>{{ link_to_route('logout', 'Logg ut') }}</li>
					@else
						<li>{{ link_to_route('login', 'Logg inn') }}</li>
					@endif
				</ul>
	        </div>
		</div>
    </div>

    <div class="container">

    	@if (Session::has('flash_message'))
    		<div class="flash-message">
		    	@if (Session::get('flash_type') == 'danger')
		    		{{ Alert::danger(Session::get('flash_message'))->close() }}
		    	@elseif (Session::get('flash_type') == 'info')
		    		{{ Alert::info(Session::get('flash_message'))->close() }}
		    	@elseif (Session::get('flash_type') == 'warning')
		    		{{ Alert::warning(Session::get('flash_message'))->close() }}
		    	@else
					{{ Alert::success(Session::get('flash_message'))->close() }}
				@endif
			</div>
		@endif

    	<div class="page-header">
		 	<h1>@yield('title')</h1>
		</div>

  		@if ($errors->any())
	    	<div class="alert alert-danger">
	    		<ul>
	    			@foreach ($errors->all() as $error)
	    				<li>{{ $error }}</li>
	    			@endforeach
	    		</ul>
	    	</div>
		@endif

		@yield('content')

		<hr>

		<footer>
			<p>&copy; Vanvik IL</p>
		</footer>

    </div> <!-- /container -->        

    	<script src="//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js"></script>
        <script>window.jQuery || document.write('<script src="{{ asset('js/vendor/jquery-1.11.1.min.js') }}"><\/script>')</script>

        <script src="{{ asset('bower_components/bootstrap/dist/js/bootstrap.min.js') }}"></script>

        <script src="{{ asset('js/main.js') }}"></script>
    </body>
</html>
