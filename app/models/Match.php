<?php

class Match extends \Eloquent {

	// Add your validation rules here
	public static $rules = [
		'tournament_id' => 'required|exists:tournaments,id',
		'kickoff_at' => 'date',
		'match_code' => 'required'
		'team_id_home' => 'integer|exists:teams,id',
		'team_id_away' => 'integer|exists:teams,id',
		'score_home' => 'integer',
		'score_away' => 'integer'
	];

	protected $fillable = ['tournament_id', 'kickoff_at', 'match_code', 'team_id_home', 'team_id_away', 'score_home', 'score_away'];
}