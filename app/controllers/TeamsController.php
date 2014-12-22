<?php

class TeamsController extends ApiController {

	/**
	 * Display a listing of teams
	 *
	 * @return Response
	 */
	public function index()
	{
		$teams = Team::all();

		if (count($teams) === 0)
		{
			return $this->respondNotFound('No teams exist.');
		}

		return $this->respond([
	        'data' => $this->transformCollection($teams)
	    ]);
	}


	/**
	 * Store a newly created team in storage.
	 *
	 * @return Response
	 */
	public function store()
	{
		$data = Input::all();

		$validator = Validator::make($data, Team::$rules);

		if ($validator->fails())
		{
			return $this->respondBadRequest('Validation fails.', $validator->messages()->toArray());
		}

		$team = Team::create($data);

		return $this->respondCreated('Team successfully created.');
	}

	/**
	 * Display the specified team.
	 *
	 * @param  int  $id
	 * @return Response
	 */
	public function show($id)
	{
		$team = Team::find($id);

		if ( ! $team)
		{
			return $this->respondNotFound('Team does not exist.');
		}

		return $this->respond([
	        'data' => $this->transform($team)
	    ]);
	}


	/**
	 * Update the specified team in storage.
	 *
	 * @param  int  $id
	 * @return Response
	 */
	public function update($id)
	{
		$data = Input::all();

		$validator = Validator::make($data, Team::$rules);

		if ($validator->fails())
		{
			return $this->respondBadRequest('Validation fails.', $validator->messages()->toArray());
		}

		$team = Team::find($id);

		$team->update($data);

		return $this->respondCreated('Team successfully updated.');
	}

	/**
	 * Remove the specified team from storage.
	 *
	 * @param  int  $id
	 * @return Response
	 */
	public function destroy($id)
	{
		Team::destroy($id);

		return $this->respondCreated('Team successfully deleted.');
	}

	private function transform($team)
	{
		return [
			'id' 			=> (int) $team['id'],
			'name' 			=> $team['name'],
			'group_code'	=> $team['group_code']
		];
	}

	private function transformCollection($teams)
	{
		return array_map([$this, 'transform'], $teams->toArray());
	}

}
