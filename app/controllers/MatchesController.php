<?php

class MatchesController extends ApiController {


	private $group_codes = array('A', 'B', 'C', 'D', 'W');

	/**
	 * Display a listing of the resource.
	 * GET /matches
	 *
	 * @return Response
	 */
	public function index($tournament_id)
	{
		$matches = Match::where('tournament_id', $tournament_id)->get();

		if (count($matches) === 0)
		{
			return $this->respondNotFound('No matches exist.');
		}

		return $this->respond([
	        'data' => $this->transformCollection($matches)
	    ]);
	}

	/**
	 * Store a newly created resource in storage.
	 * POST /matches
	 *
	 * @return Response
	 */
	public function store($tournament_id)
	{
		$data = Input::all();

		$validator = Validator::make($data, Match::$rules);

		if ($validator->fails())
		{
			return $this->respondBadRequest('Validation fails.', $validator->messages()->toArray());
		}

		$match = Match::create($data);

		return $this->respondCreated('Match successfully created.');
	}

	/**
	 * Display the specified resource.
	 * GET /matches/{id}
	 *
	 * @param  int  $id
	 * @return Response
	 */
	public function show($tournament_id, $match_id)
	{
		$match = Match::find($match_id);

		if ( ! $match)
		{
			return $this->respondNotFound('Match does not exist.');
		}

		return $this->respond([
	        'data' => $this->transform($match)
	    ]);
	}

	/**
	 * Update the specified resource in storage.
	 * PUT /matches/{id}
	 *
	 * @param  int  $id
	 * @return Response
	 */
	public function update($tournament_id, $match_id)
	{
		$data = Input::all();

		$validator = Validator::make($data, Match::$rules);

		if ($validator->fails())
		{
			return $this->respondBadRequest('Validation fails.', $validator->messages()->toArray());
		}

		$match = Match::find($id);

		$match->update($data);

		return $this->respondCreated('Match successfully updated.');
	}

	/**
	 * Remove the specified resource from storage.
	 * DELETE /matches/{id}
	 *
	 * @param  int  $id
	 * @return Response
	 */
	public function destroy($tournament_id, $match_id)
	{
		Match::destroy($id);

		return $this->respondCreated('Match successfully deleted.');
	}

	private function transform($match)
	{
		$score_home = null;
		$score_away = null;

		if ($match['score_home'] !== null && $match['score_away'] !== null)
		{
			$score_home = (int) $match['score_home'];
			$score_away = (int) $match['score_away'];
		}

		return [
			'id' 			=> (int) $match['id'],
			'tournament_id'	=> (int) $match['tournament_id'],
			'kickoff_at'	=> $match['kickoff_at'],
			'match_code'	=> $match['match_code'],
			'hometeam_id'	=> (int) $match['hometeam_id'],
			'hometeam'		=> Team::find($match['hometeam_id'])->name,
			'awayteam_id'	=> (int) $match['awayteam_id'],
			'awayteam'		=> Team::find($match['awayteam_id'])->name,
			'score_home'	=> $score_home,
			'score_away'	=> $score_away
		];
	}

	private function transformCollection($matches)
	{
		return array_map([$this, 'transform'], $matches->toArray());
	}





	private function createTeam($id, $name)
	{
		return array(
			'id'			=> $id,
			'name'			=> $name,
			'group_code'	=> null,
			'matches'		=> 0,
			'victorys'		=> 0,
			'draws'			=> 0,
			'losses'		=> 0,
			'goals_for'		=> 0,
			'goals_against'	=> 0,
			'points'		=> 0
		);
	}

	public function info($id)
	{
		$teams = array();
		$match_codes = array();
		$tables = array();

		$matches = $this->transformCollection(Match::where('tournament_id', $id)
			->orderBy('kickoff_at', 'asc')
			->get());

		foreach ($matches as $match) {

			if ( ! isset($teams[$match['hometeam_id']]))
			{
				$teams[$match['hometeam_id']] = $this->createTeam($match['hometeam_id'], $match['hometeam']);
			}

			if ( ! isset($teams[$match['awayteam_id']]))
			{
				$teams[$match['awayteam_id']] = $this->createTeam($match['awayteam_id'], $match['awayteam']);
			}

		}

		foreach ($teams as $team => $teamValue) {
			$totalMatches = 0;
			$victorys = 0;
			$draws = 0;
			$losses = 0;
			$goals_for = 0;
			$goals_against = 0;
			$points = 0;
			$group = null;

			foreach ($matches as $match) {

				if ($match['score_home'] === null && $match['score_away'] === null)
				{
					continue;
				}

				foreach ($this->group_codes as $group_code) {


					if ($teams[$team]['id'] === $match['hometeam_id'] && $match['match_code'] === $group_code)
					{
						$totalMatches++;
						$goals_for = $goals_for + $match['score_home'];
						$goals_against = $goals_against + $match['score_away'];
						$group = $match['match_code'];

						if ($match['score_home'] > $match['score_away'])
						{
							$victorys++;
							$points = $points + 3;
						}
						elseif ($match['score_home'] === $match['score_away'])
						{
							$draws++;
							$points++;
						}
						elseif ($match['score_home'] < $match['score_away'])
						{
							$losses++;
						}
					}

					if ($teams[$team]['id'] === $match['awayteam_id'] && $match['match_code'] === $group_code)
					{
						$totalMatches++;
						$goals_for = $goals_for + $match['score_away'];
						$goals_against = $goals_against + $match['score_home'];
						$group = $match['match_code'];

						if ($match['score_away'] > $match['score_home'])
						{
							$victorys++;
							$points = $points + 3;
						}
						elseif ($match['score_away'] === $match['score_home'])
						{
							$draws++;
							$points++;
						}
						elseif ($match['score_away'] < $match['score_home'])
						{
							$losses++;
						}
					}
				}
			}

			$teams[$team]['matches'] = $totalMatches;
			$teams[$team]['victorys'] = $victorys;
			$teams[$team]['draws'] = $draws;
			$teams[$team]['losses'] = $losses;
			$teams[$team]['goals_for'] = $goals_for;
			$teams[$team]['goals_against'] = $goals_against;
			$teams[$team]['points'] = $points;
			$teams[$team]['group_code'] = $group;

		}

		return $this->respond([
	        'data' => array(
	        	'teams' 		=> $teams,
	        	'matches' 		=> $matches,
	        	'group_codes'	=> $this->group_codes,
	        	'tables' 		=> $tables
	        )
	    ]);
	}







}