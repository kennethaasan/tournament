<!DOCTYPE html>
<html>
  	<head>
    	<meta charset="utf-8">
	    <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
	    <meta name="description" content="">
	    <meta name="viewport" content="width=device-width, initial-scale=1">
	    <link rel="icon" href="../../favicon.ico">

	    <title>Logg inn</title>

	    <link rel="stylesheet" href="{{ asset('bower_components/bootstrap/dist/css/bootstrap.min.css') }}">
	    <link rel="stylesheet" href="{{ asset('css/signin.css') }}">


  	</head>

  	<body>

    	<div class="container">

	      	{{ Form::open(array('route' => 'sessions.store', 'class' => 'form-signin', 'role' => 'form')) }}

		        <h2 class="form-signin-heading">Logg inn</h2>

		        @if ($errors->any())
			    	<div class="alert alert-danger">
			    		<ul>
			    			@foreach ($errors->all() as $error)
			    				<li>{{ $error }}</li>
			    			@endforeach
			    		</ul>
			    	</div>
				@endif	

		        <label for="email" class="sr-only">E-post</label>
		        <input type="email" id="email" name="email" class="form-control" placeholder="E-post" required autofocus>
		        
		        <label for="password" class="sr-only">Passord</label>
		        <input type="password" id="password" name="password" class="form-control" placeholder="Passord" required>
		        
		        <!--<div class="checkbox">
		          <label>
		            <input type="checkbox" value="remember-me"> Remember me
		          </label>
		        </div>-->

		        <button class="btn btn-lg btn-primary btn-block" type="submit">Logg inn</button>

	      	{{ Form::close() }}

    	</div> <!-- /container -->

  	</body>
</html>


