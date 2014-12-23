<?php

class Tournament extends \Eloquent {

	// Add your validation rules here
	public static $rules = [
		'name' => 'required|min:2|max:100',
		'date' => 'date'
	];

	// Don't forget to fill this array
	protected $fillable = ['name', 'date', 'location'];


	public function matches()
	{
		return $this->hasMany('Match');
	}

}