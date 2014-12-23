<?php

class Match extends \Eloquent {

	// Add your validation rules here
	public static $rules = [
		'tournament_id' => 'required|exists:tournaments,id',
		'kickoff_at' => 'date',
		'match_code' => 'required',
		'hometeam_id' => 'integer|exists:teams,id',
		'awayteam_id' => 'integer|exists:teams,id',
		'score_home' => 'integer',
		'score_away' => 'integer'
	];

	protected $fillable = ['tournament_id', 'kickoff_at', 'match_code', 'hometeam_id', 'awayteam_id', 'score_home', 'score_away'];

	public function tournament()
	{
		return $this->belongsTo('Tournament');
	}

	public function hometeam()
	{
		return $this->belongsTo('Team');
	}

	public function awayteam()
	{
		return $this->belongsTo('Team');
	}

	public function goals()
	{
		return $this->hasMany('Goal');
	}
}