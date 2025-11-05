@extends('layouts.default')

@section('title', 'Hjem')

@section('content')
	<!-- Main component for a primary marketing message or call to action -->
	<div class="jumbotron">
		<h1>Vanvik IL</h1>
		<p>
			Hei
		</p>
		
		@if (Auth::check())
			<p>Du er logget inn som <b>{{ Auth::user()->email }}</b>.</p>
		@else
			<p>{{ link_to_route('login', 'Logg inn &raquo;', null, ['class' => 'btn btn-lg btn-primary']) }}</p>
		@endif
		
	</div>

@stop