<?php

class Tournament extends \Eloquent {

	// Add your validation rules here
	public static $rules = [
		'name' => 'required|min:2|max:100',
		'start_date' => 'date',
		'end_date' => 'date',
		'groups' => 'integer|min:1|max:14'
	];

	// Don't forget to fill this array
	protected $fillable = ['name', 'start_date', 'end_date', 'location', 'groups'];

}