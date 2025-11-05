<?php

class Team extends \Eloquent {

	// Add your validation rules here
	public static $rules = [
		'name' => 'required|min:2|max:100'
	];

	// Don't forget to fill this array
	protected $fillable = ['name', 'group_code'];

	public function matches()
	{
		return $this->hasMany('Match');
	}

}