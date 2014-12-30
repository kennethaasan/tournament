<?php

class Player extends \Eloquent {

	// Add your validation rules here
	public static $rules = [
		'name' => 'required|min:2|max:100',
		'number' => 'integer',
		'paid' => 'boolean',
		//'team_id' => 'integer|exists:teams,id'
	];

	// Don't forget to fill this array
	//protected $fillable = ['name', 'number', 'paid', 'team_id'];
	protected $fillable = ['name', 'number', 'paid'];

	public function goals()
	{
		return $this->hasMany('Goal');
	}

	public function team()
	{
		return $this->belongsTo('Team');
	}

}