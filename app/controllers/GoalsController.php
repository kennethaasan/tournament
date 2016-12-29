<?php

class GoalsController extends ApiController {

	/**
	 * Display a listing of the resource.
	 * GET /goals
	 *
	 * @return Response
	 */
	public function index()
	{
		$goals = Goal::orderBy('id', 'desc')->get();

		if (count($goals) === 0)
		{
			return $this->respondNotFound('No goals exist.');
		}

		return $this->respond([
			'data' => $this->transformCollection($goals)
		]);
	}

	/**
	 * Store a newly created resource in storage.
	 * POST /goals
	 *
	 * @return Response
	 */
	public function store()
	{
		$data = Input::all();

		$validator = Validator::make($data, Goal::$rules);

		if ($validator->fails())
		{
			return $this->respondBadRequest('Validation fails.', $validator->messages()->toArray());
		}

		$goal = Goal::create($data);

		return $this->respondCreated('Goal successfully created.');
	}

	/**
	 * Display the specified resource.
	 * GET /goals/{id}
	 *
	 * @param  int  $id
	 * @return Response
	 */
	public function show($id)
	{
		$goal = Goal::find($id);

		if ( ! $goal)
		{
			return $this->respondNotFound('Goal does not exist.');
		}

		return $this->respond([
	        'data' => $this->transform($goal)
	    ]);
	}

	/**
	 * Update the specified resource in storage.
	 * PUT /goals/{id}
	 *
	 * @param  int  $id
	 * @return Response
	 */
	public function update($id)
	{
		$data = Input::all();

		$validator = Validator::make($data, Goal::$rules);

		if ($validator->fails())
		{
			return $this->respondBadRequest('Validation fails.', $validator->messages()->toArray());
		}

		$goal = Goal::find($id);

		$goal->update($data);

		return $this->respondCreated('Goal successfully updated.');
	}

	/**
	 * Remove the specified resource from storage.
	 * DELETE /goals/{id}
	 *
	 * @param  int  $id
	 * @return Response
	 */
	public function destroy($id)
	{
		Goal::destroy($id);

		return $this->respondCreated('Goal successfully deleted.');
	}

	private function transformMatch($match)
	{
		$hometeam = null;
		$awayteam = null;

		if (isset($match['hometeam_id']))
		{
			$hometeam = Team::find($match['hometeam_id'])->name;
		}

		if (isset($match['hometeam_id']))
		{
			$awayteam = Team::find($match['awayteam_id'])->name;
		}

		return [
			'hometeam_id'	=> (int) $match['hometeam_id'],
			'hometeam'		=> $hometeam,
			'awayteam_id'	=> (int) $match['awayteam_id'],
			'awayteam'		=> $awayteam,
			'match_code'	=> $match['match_code']
		];
	}

	private function transform($goal)
	{
		return [
			'id' 			=> (int) $goal['id'],
			'match_id' 		=> (int) $goal['match_id'],
			'match'			=> $this->transformMatch(Match::find($goal['match_id'])),
			'player_id'		=> (int) $goal['player_id'],
			'player'		=> Player::find($goal['player_id'])->name
		];
	}

	private function transformCollection($goals)
	{
		return array_map([$this, 'transform'], $goals->toArray());
	}

}
