<?php

class SessionsController extends \BaseController {

	/**
	 * Show the form for creating a new session
	 *
	 * @return Response
	 */
	public function create()
	{
		return View::make('sessions.create');
	}

	/**
	 * Store a newly created session in storage.
	 *
	 * @return Response
	 */
	public function store()
	{
		$input = Input::all();

		$rules = array(
			'email' => 'required|email',
	        'password' => 'required|min:5'
	    );

	    $validator = Validator::make($input, $rules);

	    if ($validator->fails()) {
		    return Redirect::back()
				->withInput()
				->withErrors($validator->messages());
		}

		$attempt = Auth::attempt([
			'email' => $input['email'],
			'password' => $input['password'],
		]);


		if ($attempt)
		{
			return Redirect::intended('/')->with('flash_message', 'Du har blitt logget inn!');
		}

		return Redirect::back()
			->with('flash_message', 'E-post eller passord er ugyldig!')
			->with('flash_type', 'danger')
			->withInput();
	}

	/**
	 * Remove the specified session from storage.
	 *
	 * @return Response
	 */
	public function destroy()
	{
		Auth::logout();

		return Redirect::home()
			->with('flash_message', 'Du har blitt logget ut!')
			->with('flash_type', 'info');
	}

}
