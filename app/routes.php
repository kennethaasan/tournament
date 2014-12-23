<?php

/*
|--------------------------------------------------------------------------
| Application Routes
|--------------------------------------------------------------------------
|
| Here is where you can register all of the routes for an application.
| It's a breeze. Simply tell Laravel the URIs it should respond to
| and give it the Closure to execute when that URI is requested.
|
*/


//Set pattern for input parameters for security
//Route::pattern('todos', '[0-9]+');

Route::get('/home', array('as' => 'home', function()
{
	return View::make('home');
}));


Route::get('/', array('as' => 'admin', 'before' => 'admin', function()
{
	return View::make('layouts/admin');
}));



Route::get('login', ['as' => 'login', 'uses' => 'SessionsController@create']);
Route::get('logout', ['as' => 'logout', 'uses' => 'SessionsController@destroy']);
Route::resource('sessions', 'SessionsController', ['only' => ['create', 'destroy', 'store']]);



// Route group for API versioning
Route::group(array('prefix' => 'api/v1'), function()
{
	Route::get('tournaments/{tournament}/info', [
		'as' => 'tournaments.info',
		'uses' => 'MatchesController@info'
	]);

	Route::group(array('before' => 'admin'), function()
	{
		Route::resource('tournaments', 'TournamentsController', ['only' => ['index', 'store', 'show', 'update', 'destroy']]);
	    Route::resource('teams', 'TeamsController', ['only' => ['index', 'store', 'show', 'update', 'destroy']]);
	    Route::resource('players', 'PlayersController', ['only' => ['index', 'store', 'show', 'update', 'destroy']]);
	    Route::resource('tournaments.matches', 'MatchesController', ['only' => ['index', 'store', 'show', 'update', 'destroy']]);
	    Route::resource('goals', 'GoalsController', ['only' => ['index', 'store', 'show', 'update', 'destroy']]);
	});


});

/*Route::group(array('before' => 'auth'), function()
{


});*/


// =============================================
// CATCH ALL ROUTE =============================
// =============================================
// all routes that are not home or api will be redirected to the frontend
// this allows angular to route them
/*App::missing(function($exception)
{
	return View::make('home');
});*/