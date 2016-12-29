<?php

class Goal extends \Eloquent {

	public static $rules = [
		'match_id' => 'required|integer|exists:matches,id',
		'player_id' => 'required|integer|exists:players,id'
	];

	protected $fillable = ['match_id', 'player_id'];

	public function match()
	{
		return $this->belongsTo('Match');
	}

	public function player()
	{
		return $this->belongsTo('Player');
	}

}
