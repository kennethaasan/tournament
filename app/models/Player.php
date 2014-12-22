<?php

class Player extends \Eloquent {

	// Add your validation rules here
	public static $rules = [
		'name' => 'required|min:2|max:100',
		'number' => 'integer',
		'paid' => 'integer',
		'team_id' => 'integer|exists:teams,id'
	];

	// Don't forget to fill this array
	protected $fillable = ['name', 'number', 'paid', 'team_id'];

}