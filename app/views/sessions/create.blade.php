@extends('layouts.default')

@section('title', 'Logg inn')

@section('content')
	<div class="row">
		<div class="col-md-12">
			{{ Form::horizontal(array('route' => 'sessions.store')) }}

				{{ ControlGroup::generate(
					Form::label('email', 'E-post:'),
					Form::email('email', null, ['required' => 'required', 'autofocus' => 'autofocus']),
					null,
		    		1
				)}}

				{{ ControlGroup::generate(
					Form::label('password', 'Passord:'),
					Form::password('password', ['required' => 'required']),
					null,
		    		1
				)}}

				<div class="form-group">
					<div class="col-sm-offset-1 col-sm-11">
						{{ Form::submit('Logg inn') }}
					</div>
				</div>

			{{ Form::close() }}
		</div>
	</div>
@stop